"use client"

import { useEffect, useRef } from "react"

/** Renders a Vega-Lite spec returned by the agent's data_to_chart tool, themed for the dark UI */
export function VegaChart({ spec }: { spec: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let view: { finalize: () => void } | undefined
    let cancelled = false
    ;(async () => {
      try {
        const parsed = JSON.parse(spec)
        const { default: embed } = await import("vega-embed")
        if (cancelled || !ref.current) return
        const width = Math.max(220, ref.current.clientWidth - 24)
        const result = await embed(
          ref.current,
          {
            ...parsed,
            width,
            height: 220,
            autosize: { type: "fit", contains: "padding" },
            background: "transparent",
            config: {
              ...(parsed.config ?? {}),
              axis: { labelColor: "#8aa4c8", titleColor: "#cfe3ff", gridColor: "rgba(41,181,232,0.1)", domainColor: "#1c3558" },
              legend: { labelColor: "#cfe3ff", titleColor: "#cfe3ff" },
              title: { color: "#e6f1ff" },
              view: { stroke: "transparent" },
              range: { category: ["#29B5E8", "#71D3DC", "#FF9F36", "#7D44CF", "#22c55e", "#f43f5e", "#11567F"] },
              mark: { color: "#29B5E8" },
            },
          },
          { actions: false, renderer: "svg" },
        )
        view = result.view
      } catch (e) {
        if (ref.current) ref.current.textContent = "No se pudo renderizar la grafica"
        console.error("[vega] render failed", e)
      }
    })()
    return () => {
      cancelled = true
      view?.finalize()
    }
  }, [spec])

  return <div ref={ref} className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[rgba(41,181,232,0.15)] bg-[#06142a] p-2" />
}
