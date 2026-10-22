"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { Snowflake, X } from "lucide-react"
import { APP_TITLE, DEFAULT_YEAR, LOGO_SRC, YEARS } from "@/lib/constants"
import type { DashboardData, InsightsData } from "@/lib/types"
import { DemandClock, FlowSankey, MenuTreemap, PriceBubbles } from "@/components/insights-charts"
import { fmtMoney } from "@/lib/format"
import { KpiCards } from "@/components/kpi-cards"
import { AgentChat } from "@/components/agent-chat"
import { ReviewsFeed } from "@/components/reviews-feed"
import { BrandsChart, HeatmapChart, SentimentChart, TrendChart } from "@/components/charts"

// WebGL globe must render only in the browser
const GlobeMap = dynamic(() => import("@/components/globe-map").then((m) => m.GlobeMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-xs text-[#8aa4c8]">Cargando globo 3D…</div>,
})

const CitySim = dynamic(() => import("@/components/city-sim").then((m) => m.CitySim), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-xs text-[#8aa4c8]">Construyendo la ciudad…</div>,
})

const TABS = [
  { id: "panorama", label: "Panorama global" },
  { id: "ciudad", label: "Ciudad viva 3D" },
  { id: "menu", label: "Menu y flujos" },
] as const
type TabId = (typeof TABS)[number]["id"]

function Panel({ title, children, className = "", right }: { title: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={`glass flex flex-col p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title">{title}</h2>
        {right}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

export function CommandCenter() {
  const [anio, setAnio] = useState<number>(DEFAULT_YEAR)
  const [ciudad, setCiudad] = useState<string | null>(null)
  const [marca, setMarca] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>("panorama")

  const insights = useQuery<InsightsData>({
    queryKey: ["insights", anio],
    enabled: tab !== "panorama",
    queryFn: async () => {
      const res = await fetch(`/api/insights?anio=${anio}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Error cargando insights")
      return json
    },
  })
  const ins = insights.data

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard", anio],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?anio=${anio}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Error cargando el dashboard")
      return json
    },
  })

  const ciudadSel = data?.ciudades.find((c) => c.ciudad === ciudad)

  return (
    <div className="grid-bg min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[rgba(41,181,232,0.12)] bg-[#050b18]/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-5">
          <Image src={LOGO_SRC} alt="" width={34} height={34} />
          <div>
            <div className="text-[15px] font-bold tracking-tight text-white">{APP_TITLE}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8aa4c8]">
              <Snowflake className="h-3 w-3 text-[#29B5E8]" /> Datos en vivo desde Snowflake · TB_101
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-[rgba(41,181,232,0.18)] bg-[#06142a] p-1">
            {YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setAnio(y)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${y === anio ? "bg-[#29B5E8] text-white shadow-[0_0_16px_rgba(41,181,232,0.5)]" : "text-[#8aa4c8] hover:text-white"}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          {error && <div className="glass p-4 text-sm text-rose-300">{(error as Error).message}</div>}
          {isLoading || !data ? (
            <div className="glass flex h-32 items-center justify-center text-sm text-[#8aa4c8]">Consultando Snowflake…</div>
          ) : (
            <KpiCards kpis={data.kpis} anio={data.anio} />
          )}

          <nav className="flex gap-1 rounded-xl border border-[rgba(41,181,232,0.18)] bg-[#06142a] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${t.id === tab ? "bg-[#29B5E8] text-white shadow-[0_0_16px_rgba(41,181,232,0.5)]" : "text-[#8aa4c8] hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab !== "panorama" && insights.error && (
            <div className="glass p-4 text-sm text-rose-300">{(insights.error as Error).message}</div>
          )}

          {tab === "ciudad" && (
            <Panel title="Ciudad viva · food trucks en tiempo simulado (demanda real por hora, 2022)" className="h-[640px]">
              {ins ? <CitySim data={ins.hora} /> : <div className="text-xs text-[#8aa4c8]">Consultando Snowflake…</div>}
            </Panel>
          )}

          {tab === "menu" && (
            <>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <Panel title={`Mapa del menu: categoria > item (${anio})`} className="h-[420px]">
                  {ins && <MenuTreemap data={ins.items} />}
                </Panel>
                <Panel title="Reloj de demanda · top 5 marcas por hora (2022)" className="h-[420px]">
                  {ins && <DemandClock data={ins.hora} />}
                </Panel>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title={`Flujo de ventas: pais > tipo de menu (${anio})`} className="h-[460px]">
                  {ins && <FlowSankey data={ins.flujo} />}
                </Panel>
                <Panel title="Precio vs volumen por item (tamano = ventas)" className="h-[460px]">
                  {ins && <PriceBubbles data={ins.items} />}
                </Panel>
              </div>
            </>
          )}

          {tab === "panorama" && (
          <>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel
              title="Red global de food trucks"
              className="h-[460px]"
              right={
                ciudadSel && (
                  <button type="button" onClick={() => setCiudad(null)} className="flex items-center gap-1 rounded-lg bg-[#FF9F36]/15 px-2 py-1 text-[11px] text-[#FF9F36]">
                    {ciudadSel.ciudad}: {fmtMoney(ciudadSel.ventas)} <X className="h-3 w-3" />
                  </button>
                )
              }
            >
              {data && <GlobeMap ciudades={data.ciudades} selected={ciudad} onSelect={setCiudad} />}
            </Panel>
            <Panel
              title={`Top 10 marcas ${anio}`}
              className="h-[460px]"
              right={marca && <button type="button" onClick={() => setMarca(null)} className="flex items-center gap-1 text-[11px] text-[#FF9F36]">{marca} <X className="h-3 w-3" /></button>}
            >
              {data && <BrandsChart data={data.marcas} selected={marca} onSelect={setMarca} />}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Tendencia mensual de ventas (2019-2022)" className="h-[300px]">
              {data && <TrendChart data={data.tendencia} anio={anio} />}
            </Panel>
            <Panel title={`Mapa de calor: dia de la semana x mes (${anio})`} className="h-[300px]">
              {data && <HeatmapChart data={data.heatmap} />}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Panel title="Sentimiento de clientes por marca (AI_SENTIMENT)" className="h-[420px]">
              {data && <SentimentChart data={data.sentimiento} />}
            </Panel>
            <Panel title={marca ? `Voz del cliente · ${marca}` : "Voz del cliente · ultimas reviews"} className="h-[420px]">
              <ReviewsFeed marca={marca} />
            </Panel>
          </div>
          </>
          )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)]">
          <div className="h-[640px] xl:h-full">
            <AgentChat />
          </div>
        </aside>
      </main>
    </div>
  )
}
