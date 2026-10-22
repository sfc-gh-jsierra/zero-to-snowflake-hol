"use client"

import { useRef, useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BarChart3, Brain, ChevronDown, Code2, Database, Loader2, MessageSquareQuote, Search, Send, Sparkles, TrendingUp, Wrench } from "lucide-react"
import { SUGGESTED_QUESTIONS } from "@/lib/constants"
import type { AgentEvent } from "@/lib/types"
import { VegaChart } from "@/components/vega-chart"

interface ToolCall {
  id: string
  name: string
  sql?: string
  status?: string
}

interface Turn {
  role: "user" | "assistant"
  text: string
  thinking?: string
  status?: string
  tools?: ToolCall[]
  charts?: string[]
  tables?: { columns: string[]; rows: unknown[][] }[]
  citations?: { title: string; text: string }[]
  error?: string
  done?: boolean
}

const TOOL_META: Record<string, { label: string; icon: typeof Database; color: string }> = {
  VentasTastyBytes: { label: "Cortex Analyst", icon: Database, color: "#29B5E8" },
  ReviewsClientes: { label: "Cortex Search", icon: Search, color: "#71D3DC" },
  PronosticoVentas: { label: "Pronostico (SP)", icon: TrendingUp, color: "#FF9F36" },
  data_to_chart: { label: "Grafica", icon: BarChart3, color: "#7D44CF" },
}

function ToolChip({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false)
  const meta = TOOL_META[tool.name] ?? { label: tool.name, icon: Wrench, color: "#8aa4c8" }
  const Icon = meta.icon
  const running = !tool.status
  return (
    <div className="rounded-lg border border-[rgba(41,181,232,0.15)] bg-[#06142a]/80">
      <button
        type="button"
        onClick={() => tool.sql && setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs"
      >
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: meta.color }} /> : <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />}
        <span className="font-medium text-[#cfe3ff]">{meta.label}</span>
        <span className="text-[#8aa4c8]">· {tool.name}</span>
        {tool.status === "error" && <span className="text-rose-400">error</span>}
        {tool.sql && (
          <span className="ml-auto flex items-center gap-1 text-[#8aa4c8]">
            <Code2 className="h-3 w-3" /> SQL <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
          </span>
        )}
      </button>
      {open && tool.sql && (
        <pre className="scroll-thin max-h-56 overflow-auto border-t border-[rgba(41,181,232,0.12)] px-3 py-2 text-[11px] leading-relaxed text-[#9fe3ff]">
          {tool.sql}
        </pre>
      )}
    </div>
  )
}

function AssistantTurn({ turn }: { turn: Turn }) {
  const [showThinking, setShowThinking] = useState(false)
  return (
    <div className="min-w-0 space-y-2">
      {turn.thinking && (
        <button type="button" onClick={() => setShowThinking((s) => !s)} className="flex items-center gap-1.5 text-[11px] text-[#8aa4c8] hover:text-[#cfe3ff]">
          <Brain className="h-3.5 w-3.5" /> Razonamiento del agente <ChevronDown className={`h-3 w-3 transition ${showThinking ? "rotate-180" : ""}`} />
        </button>
      )}
      {showThinking && turn.thinking && (
        <div className="scroll-thin max-h-40 overflow-auto rounded-lg border-l-2 border-[#29B5E8]/50 bg-[#06142a]/60 px-3 py-2 text-[11px] italic leading-relaxed text-[#8aa4c8]">
          {turn.thinking}
        </div>
      )}
      {!!turn.tools?.length && <div className="space-y-1.5">{turn.tools.map((t) => <ToolChip key={t.id || t.name} tool={t} />)}</div>}
      {!turn.done && turn.status && !turn.text && (
        <div className="flex items-center gap-2 text-xs text-[#71D3DC]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {turn.status}
        </div>
      )}
      {turn.text && (
        <div className={`prose-agent min-w-0 break-words text-[13px] text-[#dbe9ff] ${turn.done ? "" : "caret"}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
        </div>
      )}
      {turn.charts?.map((c, i) => <VegaChart key={i} spec={c} />)}
      {turn.tables?.map((t, i) => (
        <div key={i} className="scroll-thin max-h-48 overflow-auto rounded-lg border border-[rgba(41,181,232,0.15)]">
          <table className="w-full min-w-max text-[11px]">
            <thead className="sticky top-0 bg-[#0b1d38] text-[#8aa4c8]">
              <tr>{t.columns.map((c) => <th key={c} className="px-2 py-1 text-left font-medium">{c}</th>)}</tr>
            </thead>
            <tbody>
              {t.rows.map((r, j) => (
                <tr key={j} className="border-t border-[rgba(41,181,232,0.08)] text-[#cfe3ff]">
                  {r.map((v, k) => <td key={k} className="px-2 py-1">{String(v ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {!!turn.citations?.length && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8aa4c8]"><MessageSquareQuote className="h-3.5 w-3.5" /> Reviews citadas</div>
          {turn.citations.slice(0, 4).map((c, i) => (
            <div key={i} className="rounded-lg bg-[#06142a]/70 px-3 py-2 text-[11px] text-[#b8cbe6]">
              <span className="font-semibold text-[#71D3DC]">{c.title}</span> — {c.text.slice(0, 220)}
              {c.text.length > 220 ? "…" : ""}
            </div>
          ))}
        </div>
      )}
      {turn.error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{turn.error}</div>}
    </div>
  )
}

export function AgentChat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [turns])

  const patchLast = (fn: (t: Turn) => Turn) =>
    setTurns((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])])

  const apply = (e: AgentEvent) => {
    patchLast((t) => {
      switch (e.type) {
        case "status":
          return { ...t, status: e.message }
        case "thinking":
          return { ...t, thinking: (t.thinking ?? "") + e.text }
        case "text":
          return { ...t, text: t.text + e.text }
        case "tool_use":
          return { ...t, tools: [...(t.tools ?? []), { id: e.id, name: e.name }] }
        case "tool_result": {
          const tools = [...(t.tools ?? [])]
          const idx = tools.findIndex((x) => (e.id && x.id === e.id) || (!x.status && x.name === e.name))
          const merged = { id: e.id, name: e.name, sql: e.sql, status: e.status ?? "success" }
          if (idx >= 0) tools[idx] = { ...tools[idx], ...merged, name: tools[idx].name || e.name }
          else tools.push(merged)
          return { ...t, tools }
        }
        case "chart":
          return { ...t, charts: [...(t.charts ?? []), e.spec] }
        case "table":
          return { ...t, tables: [...(t.tables ?? []), { columns: e.columns, rows: e.rows }] }
        case "citations":
          return { ...t, citations: [...(t.citations ?? []), ...e.items] }
        case "error":
          return { ...t, error: e.message }
        case "done":
          return { ...t, done: true }
      }
    })
  }

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    setInput("")
    setBusy(true)
    const history = [...turns.filter((t) => t.text).map((t) => ({ role: t.role, text: t.text })), { role: "user" as const, text: q }]
    setTurns((prev) => [...prev, { role: "user", text: q, done: true }, { role: "assistant", text: "", status: "Conectando con el agente" }])
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let sep: number
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const line = buffer.slice(0, sep).replace(/^data: /, "")
          buffer = buffer.slice(sep + 2)
          if (line) apply(JSON.parse(line) as AgentEvent)
        }
      }
    } catch (e) {
      apply({ type: "error", message: e instanceof Error ? e.message : "Error de conexion" })
      apply({ type: "done" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[rgba(41,181,232,0.12)] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#29B5E8] to-[#11567F] shadow-[0_0_24px_rgba(41,181,232,0.45)]">
          <Sparkles className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Tasty Bytes Copilot</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8aa4c8]">
            <span className="pulse-dot" /> Agente de Snowflake CoWork · Analyst · Search · Pronostico
          </div>
        </div>
      </div>

      <div ref={scroller} className="scroll-thin min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-[#b8cbe6]">
              Preguntale al agente sobre ventas, clientes, clima o pronosticos. Ve en vivo que herramienta usa y el SQL que genera.
            </p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="block w-full rounded-xl border border-[rgba(41,181,232,0.18)] bg-[#06142a]/60 px-3 py-2 text-left text-xs text-[#cfe3ff] transition hover:border-[#29B5E8] hover:bg-[#0b2244]"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.div key={i} className="min-w-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {t.role === "user" ? (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-[#29B5E8] to-[#1a8fc0] px-3.5 py-2 text-[13px] text-white shadow-lg">
                  {t.text}
                </div>
              ) : (
                <AssistantTurn turn={t} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
        className="flex items-center gap-2 border-t border-[rgba(41,181,232,0.12)] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? "El agente esta trabajando..." : "Pregunta lo que quieras de Tasty Bytes"}
          disabled={busy}
          className="flex-1 rounded-xl border border-[rgba(41,181,232,0.2)] bg-[#06142a] px-3.5 py-2.5 text-sm text-white placeholder:text-[#5f7aa0] focus:border-[#29B5E8] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#29B5E8] text-white transition hover:bg-[#1fa3d4] disabled:opacity-40"
          aria-label="Enviar"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
