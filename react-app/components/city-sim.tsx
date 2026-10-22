"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import DeckGL from "@deck.gl/react"
import { ColumnLayer, PathLayer, SolidPolygonLayer, ScatterplotLayer } from "@deck.gl/layers"
import { TripsLayer } from "@deck.gl/geo-layers"
import { Pause, Play } from "lucide-react"
import type { HourPoint } from "@/lib/types"
import { fmtMoney, fmtNumber } from "@/lib/format"

// Procedural city laid out around (0,0); 1 block ≈ 0.0018° (~200 m)
const GRID = 14
const STEP = 0.0018
const ORIGIN = -(GRID * STEP) / 2
const LOOP = 1800 // animation time units per simulated hour
const PALETTE: [number, number, number][] = [
  [41, 181, 232], [255, 159, 54], [113, 211, 220], [125, 68, 207], [212, 91, 144], [143, 211, 120],
  [255, 213, 79], [90, 140, 255],
]

function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const node = (i: number, j: number): [number, number] => [ORIGIN + i * STEP, ORIGIN + j * STEP]

interface Building { polygon: [number, number][]; height: number; hot: number }
interface Trip { path: [number, number][]; timestamps: number[]; color: [number, number, number]; marca: string }

function buildCity(seed: string) {
  const r = rng(seed)
  const buildings: Building[] = []
  const center = GRID / 2
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (r() < 0.12) continue // plazas / parques
      const d = Math.hypot(i + 0.5 - center, j + 0.5 - center) / center
      const lots = r() < 0.5 ? 1 : 2
      for (let k = 0; k < lots; k++) {
        const pad = STEP * 0.14
        const w = (STEP - pad * 2) / lots
        const x0 = ORIGIN + i * STEP + pad + k * w
        const y0 = ORIGIN + j * STEP + pad
        const x1 = x0 + w * 0.88
        const y1 = y0 + (STEP - pad * 2) * (0.6 + r() * 0.4)
        const height = 20 + Math.pow(Math.max(0, 1 - d), 2.2) * 420 * (0.4 + r()) + r() * 40
        buildings.push({ polygon: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], height, hot: r() })
      }
    }
  const roads: { path: [number, number][] }[] = []
  for (let i = 0; i <= GRID; i++) {
    roads.push({ path: [node(i, 0), node(i, GRID)] })
    roads.push({ path: [node(0, i), node(GRID, i)] })
  }
  return { buildings, roads, r }
}

function makeTrip(r: () => number, color: [number, number, number], marca: string): Trip {
  let i = Math.floor(r() * (GRID + 1))
  let j = Math.floor(r() * (GRID + 1))
  const path: [number, number][] = [node(i, j)]
  const timestamps = [0]
  let t = r() * 200
  while (t < LOOP) {
    const horiz = r() < 0.5
    const len = 1 + Math.floor(r() * 4)
    const dir = r() < 0.5 ? -1 : 1
    for (let s = 0; s < len; s++) {
      if (horiz) i = Math.min(GRID, Math.max(0, i + dir))
      else j = Math.min(GRID, Math.max(0, j + dir))
      t += 40 + r() * 30
      path.push(node(i, j))
      timestamps.push(t)
    }
    if (r() < 0.35) {
      t += 60 + r() * 80 // parada para vender
      path.push(node(i, j))
      timestamps.push(t)
    }
  }
  return { path, timestamps, color, marca }
}

export function CitySim({ data }: { data: HourPoint[] }) {
  const ciudades = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of data) m.set(d.ciudad, (m.get(d.ciudad) ?? 0) + d.ventas)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [data])
  const [ciudad, setCiudad] = useState<string>("")
  const sel = ciudad || ciudades[0] || ""
  const [hora, setHora] = useState(12)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [bearing, setBearing] = useState(25)
  const raf = useRef<number | null>(null)

  const porHora = useMemo(() => {
    const rows = data.filter((d) => d.ciudad === sel)
    const horas = [...new Set(rows.map((d) => d.hora))].sort((a, b) => a - b)
    const brands = [...new Set(rows.map((d) => d.marca))].sort()
    return {
      horas,
      brands,
      rows,
      total: (h: number) => rows.filter((d) => d.hora === h).reduce((s, d) => s + d.ventas, 0),
    }
  }, [data, sel])
  const maxHora = Math.max(1, ...porHora.horas.map((h) => porHora.total(h)))

  // Animation clock: trucks move continuously; the hour advances each loop
  useEffect(() => {
    const loop = () => {
      if (playing) {
        setBearing((b) => b + 0.04)
        setTime((t) => {
          const next = t + 4
          if (next >= LOOP) {
            setHora((h) => {
              const hs = porHora.horas
              if (!hs.length) return h
              const idx = hs.indexOf(h)
              return hs[(idx + 1) % hs.length]
            })
            return 0
          }
          return next
        })
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [playing, porHora.horas])

  const city = useMemo(() => buildCity(sel), [sel])

  const actual = porHora.rows.filter((d) => d.hora === hora).sort((a, b) => b.ventas - a.ventas)
  const ventasHora = actual.reduce((s, d) => s + d.ventas, 0)
  const ordenesHora = actual.reduce((s, d) => s + d.ordenes, 0)
  const intensidad = ventasHora / maxHora

  // Truck fleet scales with real demand in this hour (one trip per brand share)
  const trips = useMemo(() => {
    const r = rng(`${sel}-${hora}`)
    const n = Math.round(18 + intensidad * 90)
    const out: Trip[] = []
    const total = Math.max(1, ventasHora)
    for (const d of actual) {
      const k = Math.max(1, Math.round((d.ventas / total) * n))
      const color = PALETTE[porHora.brands.indexOf(d.marca) % PALETTE.length]
      for (let x = 0; x < k; x++) out.push(makeTrip(r, color, d.marca))
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, hora, ventasHora])

  const hotspots = useMemo(() => {
    const r = rng(`${sel}-hot`)
    return Array.from({ length: 22 }, () => ({
      position: node(1 + Math.floor(r() * (GRID - 1)), 1 + Math.floor(r() * (GRID - 1))),
      w: r(),
    }))
  }, [sel])

  const pulse = (Math.sin(time / 60) + 1) / 2

  const layers = [
    new SolidPolygonLayer({
      id: "ground",
      data: [{ polygon: [node(-1, -1), node(GRID + 1, -1), node(GRID + 1, GRID + 1), node(-1, GRID + 1)] }],
      getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
      getFillColor: [6, 16, 34],
    }),
    new PathLayer({
      id: "roads",
      data: city.roads,
      getPath: (d: { path: [number, number][] }) => d.path,
      getColor: [41, 181, 232, 70],
      getWidth: 6,
      widthMinPixels: 1,
    }),
    new SolidPolygonLayer<Building>({
      id: "buildings",
      data: city.buildings,
      extruded: true,
      getPolygon: (d) => d.polygon,
      getElevation: (d) => d.height,
      getFillColor: (d) => {
        const lit = d.hot < 0.25 + intensidad * 0.55
        return lit ? [30 + 60 * intensidad, 90 + 60 * intensidad, 150 + 70 * intensidad, 235] : [16, 32, 60, 235]
      },
      material: { ambient: 0.35, diffuse: 0.6, shininess: 40, specularColor: [41, 181, 232] },
      updateTriggers: { getFillColor: [intensidad] },
    }),
    new ColumnLayer({
      id: "demand",
      data: hotspots,
      diskResolution: 24,
      radius: 22,
      extruded: true,
      getPosition: (d: { position: [number, number] }) => d.position,
      getElevation: (d: { w: number }) => 60 + d.w * 520 * intensidad * (0.7 + 0.3 * pulse),
      getFillColor: (d: { w: number }) => [255, 159, 54, 120 + 100 * d.w],
      updateTriggers: { getElevation: [intensidad, pulse] },
    }),
    new ScatterplotLayer({
      id: "halo",
      data: hotspots,
      getPosition: (d: { position: [number, number] }) => d.position,
      getRadius: (d: { w: number }) => 40 + 70 * pulse * d.w,
      getFillColor: [255, 159, 54, 40],
      updateTriggers: { getRadius: [pulse] },
    }),
    new TripsLayer<Trip>({
      id: "trucks",
      data: trips,
      getPath: (d) => d.path,
      getTimestamps: (d) => d.timestamps,
      getColor: (d) => d.color,
      widthMinPixels: 4,
      capRounded: true,
      jointRounded: true,
      trailLength: 260,
      currentTime: time,
      fadeTrail: true,
    }),
  ]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <DeckGL
        viewState={{ longitude: 0, latitude: 0, zoom: 14.3, pitch: 58, bearing, transitionDuration: 0 }}
        controller={false}
        layers={layers}
        style={{ position: "absolute", inset: "0" }}
      />

      <div className="pointer-events-none absolute left-3 top-3 space-y-2">
        <div className="glass pointer-events-auto flex items-center gap-2 px-3 py-2">
          <select
            value={sel}
            onChange={(e) => setCiudad(e.target.value)}
            className="rounded-md border border-[rgba(41,181,232,0.25)] bg-[#06142a] px-2 py-1 text-xs text-white"
          >
            {ciudades.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="rounded-md bg-[#29B5E8]/20 p-1.5 text-[#29B5E8]"
            aria-label={playing ? "Pausar" : "Reproducir"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="glass px-3 py-2 text-xs text-[#cfe3ff]">
          <div className="text-[28px] font-bold leading-none text-white">{String(hora).padStart(2, "0")}:00</div>
          <div className="mt-1 text-[#8aa4c8]">Ventas en esta hora (2022)</div>
          <div className="text-base font-semibold text-[#FF9F36]">{fmtMoney(ventasHora)}</div>
          <div className="text-[#8aa4c8]">{fmtNumber(ordenesHora)} ordenes · {trips.length} trucks en ruta</div>
        </div>
      </div>

      <div className="glass absolute right-3 top-3 w-52 px-3 py-2 text-[11px]">
        <div className="mb-1 font-semibold text-white">Marcas activas</div>
        {actual.slice(0, 6).map((d) => (
          <div key={d.marca} className="flex items-center gap-2 py-0.5 text-[#cfe3ff]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: `rgb(${PALETTE[porHora.brands.indexOf(d.marca) % PALETTE.length].join(",")})` }}
            />
            <span className="truncate">{d.marca}</span>
            <span className="ml-auto text-[#8aa4c8]">{fmtMoney(d.ventas)}</span>
          </div>
        ))}
      </div>

      {/* Hour timeline: bar height = real hourly sales; click to jump */}
      <div className="glass absolute inset-x-3 bottom-3 flex h-16 items-end gap-1 px-3 py-2">
        {porHora.horas.map((h) => {
          const v = porHora.total(h) / maxHora
          return (
            <button
              key={h}
              type="button"
              onClick={() => {
                setHora(h)
                setTime(0)
              }}
              className="group flex flex-1 flex-col items-center justify-end"
              title={`${h}:00 · ${fmtMoney(porHora.total(h))}`}
            >
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(6, v * 34)}px`,
                  background: h === hora ? "#FF9F36" : "rgba(41,181,232,0.55)",
                  boxShadow: h === hora ? "0 0 12px rgba(255,159,54,0.8)" : "none",
                }}
              />
              <span className={`mt-0.5 text-[9px] ${h === hora ? "text-white" : "text-[#8aa4c8]"}`}>{h}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
