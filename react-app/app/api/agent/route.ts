import fs from "fs"
import { querySnowflakeLongRunning } from "@/lib/snowflake"
import { AGENT_DB, AGENT_NAME, AGENT_SCHEMA } from "@/lib/constants"
import type { AgentEvent } from "@/lib/types"

export const dynamic = "force-dynamic"

const SPCS_TOKEN_PATH = "/snowflake/session/token"
const AGENT_FQN = `${AGENT_DB}.${AGENT_SCHEMA}.${AGENT_NAME}`

interface ChatMessage {
  role: "user" | "assistant"
  content: { type: "text"; text: string }[]
}

type Emit = (e: AgentEvent) => void
type Json = Record<string, any>

/* ---------- Normalization: agent content items / SSE events -> AgentEvent ---------- */

function emitToolResult(emit: Emit, tr: Json) {
  const first = Array.isArray(tr?.content) ? tr.content.find((c: Json) => c?.json) : undefined
  emit({
    type: "tool_result",
    id: tr?.tool_use_id ?? "",
    name: tr?.name ?? "",
    sql: first?.json?.sql,
    status: tr?.status,
  })
}

function emitTable(emit: Emit, rs: Json) {
  const columns: string[] = rs?.resultSetMetaData?.rowType?.map((c: Json) => c.name) ?? []
  const rows: unknown[][] = Array.isArray(rs?.data) ? rs.data.slice(0, 50) : []
  if (columns.length) emit({ type: "table", columns, rows })
}

function emitCitations(emit: Emit, annotations: Json[] | undefined) {
  const items = (annotations ?? [])
    .filter((a) => a?.type === "cortex_search_citation")
    .map((a) => ({ title: String(a.doc_title ?? a.doc_id ?? "Review"), text: String(a.text ?? "") }))
  if (items.length) emit({ type: "citations", items })
}

/** Final (non-streamed) agent response -> ordered events. Used by the local fallback. */
function emitContentItems(emit: Emit, content: Json[]) {
  for (const c of content) {
    switch (c?.type) {
      case "thinking":
        if (c.thinking?.text) emit({ type: "thinking", text: c.thinking.text })
        break
      case "text":
        if (c.text) emit({ type: "text", text: c.text })
        emitCitations(emit, c.annotations)
        break
      case "tool_use":
        emit({ type: "tool_use", id: c.tool_use?.tool_use_id ?? "", name: c.tool_use?.name ?? "", input: c.tool_use?.input })
        break
      case "tool_result":
        emitToolResult(emit, c.tool_result)
        break
      case "chart":
        if (c.chart?.chart_spec) emit({ type: "chart", spec: c.chart.chart_spec })
        break
      case "table":
        emitTable(emit, c.table?.result_set)
        break
    }
  }
}

/** One upstream SSE event from agents:run -> AgentEvent(s) */
function emitStreamEvent(emit: Emit, event: string, data: Json) {
  switch (event) {
    case "response.status":
      emit({ type: "status", message: data.message ?? data.status ?? "" })
      break
    case "response.thinking.delta":
      emit({ type: "thinking", text: data.text ?? "" })
      break
    case "response.text.delta":
      emit({ type: "text", text: data.text ?? "" })
      break
    case "response.text.annotation":
      emitCitations(emit, [data.annotation])
      break
    case "response.tool_use":
      emit({ type: "tool_use", id: data.tool_use_id ?? "", name: data.name ?? "", input: data.input })
      break
    case "response.tool_result":
      emitToolResult(emit, data)
      break
    case "response.chart":
      if (data.chart_spec) emit({ type: "chart", spec: data.chart_spec })
      break
    case "response.table":
      emitTable(emit, data.result_set)
      break
    case "error":
      emit({ type: "error", message: data.message ?? "Agent error" })
      break
  }
}

/* ---------- Transports ---------- */

/** In Snowflake App Runtime: stream from the Cortex Agents REST API with the service token */
async function streamFromRest(messages: ChatMessage[], emit: Emit, signal: AbortSignal) {
  const token = fs.readFileSync(SPCS_TOKEN_PATH, "utf8").trim()
  const host = process.env.SNOWFLAKE_HOST
  const url = `https://${host}/api/v2/databases/${AGENT_DB}/schemas/${AGENT_SCHEMA}/agents/${AGENT_NAME}:run`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Snowflake-Authorization-Token-Type": "OAUTH",
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ messages, stream: true }),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`Agent API ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      let event = "message"
      const dataLines: string[] = []
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim())
      }
      if (!dataLines.length) continue
      try {
        emitStreamEvent(emit, event, JSON.parse(dataLines.join("\n")))
      } catch {
        /* ignore keep-alives and unknown payloads */
      }
    }
  }
}

/** Local dev: same agent through SQL (DATA_AGENT_RUN), replayed as events */
async function runViaSql(messages: ChatMessage[], emit: Emit) {
  emit({ type: "status", message: "Consultando al agente (modo local via SQL)" })
  const rows = await querySnowflakeLongRunning(
    "SELECT SNOWFLAKE.CORTEX.DATA_AGENT_RUN(?, ?) AS RESP",
    { binds: [AGENT_FQN, JSON.stringify({ messages })], maxWaitMs: 180_000 },
  )
  const resp = JSON.parse(String(rows[0]?.RESP ?? "{}"))
  if (resp.code && !resp.content) throw new Error(resp.message ?? "Agent error")
  emitContentItems(emit, resp.content ?? [])
}

/* ---------- Route ---------- */

export async function POST(req: Request) {
  let messages: ChatMessage[]
  try {
    const body = await req.json()
    messages = (body.messages ?? [])
      .filter((m: Json) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
      .slice(-12)
      .map((m: Json) => ({ role: m.role, content: [{ type: "text", text: String(m.text).slice(0, 4000) }] }))
    if (!messages.length || messages[messages.length - 1].role !== "user") throw new Error("empty")
  } catch {
    return Response.json({ error: "Body must be { messages: [{ role, text }] } ending with a user message" }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 180_000)

  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (e) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))
      try {
        if (fs.existsSync(SPCS_TOKEN_PATH) && process.env.SNOWFLAKE_HOST) {
          await streamFromRest(messages, emit, abort.signal)
        } else {
          await runViaSql(messages, emit)
        }
      } catch (e) {
        console.error(new Date().toISOString(), "[agent] run failed", e)
        emit({ type: "error", message: e instanceof Error ? e.message : "Agent run failed" })
      } finally {
        clearTimeout(timer)
        emit({ type: "done" })
        controller.close()
      }
    },
    cancel() {
      abort.abort()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
