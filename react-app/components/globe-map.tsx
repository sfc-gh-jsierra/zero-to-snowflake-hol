"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import DeckGL from "@deck.gl/react"
import { _GlobeView as GlobeView, type PickingInfo } from "@deck.gl/core"
import { ArcLayer, ColumnLayer, GeoJsonLayer, ScatterplotLayer, SolidPolygonLayer } from "@deck.gl/layers"
import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"
import countries110 from "world-atlas/countries-110m.json"
import type { CityPoint } from "@/lib/types"
import { fmtMoney } from "@/lib/format"

const COUNTRIES = feature(
  countries110 as unknown as Topology,
  (countries110 as unknown as Topology).objects.countries,
) as unknown as GeoJSON.FeatureCollection

// Ocean sphere: one polygon covering the whole globe
const OCEAN: { polygon: [number, number][] }[] = [
  { polygon: [[-180, 90], [0, 90], [180, 90], [180, -90], [0, -90], [-180, -90]] },
]

interface Props {
  ciudades: CityPoint[]
  selected?: string | null
  onSelect?: (ciudad: string | null) => void
}

export function GlobeMap({ ciudades, selected, onSelect }: Props) {
  const [viewState, setViewState] = useState({ longitude: -30, latitude: 25, zoom: 0.55 })
  const [interacting, setInteracting] = useState(false)
  const [tick, setTick] = useState(0)
  const raf = useRef<number | null>(null)

  // Slow auto-rotation + arc animation clock; pauses while the user drags
  useEffect(() => {
    const loop = () => {
      setTick((t) => (t + 1) % 100000)
      if (!interacting) setViewState((v) => ({ ...v, longitude: ((v.longitude + 0.06 + 180) % 360) - 180 }))
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [interacting])

  const maxVentas = useMemo(() => Math.max(1, ...ciudades.map((c) => c.ventas)), [ciudades])

  // Arcs: from the #1 city to the next 9 — the "network" of the fleet
  const arcs = useMemo(() => {
    if (ciudades.length < 2) return []
    const [hub, ...rest] = ciudades
    return rest.slice(0, 12).map((c, i) => ({ from: hub, to: c, i }))
  }, [ciudades])

  const phase = (tick % 240) / 240

  const layers = [
    new SolidPolygonLayer({
      id: "ocean",
      data: OCEAN,
      getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
      getFillColor: [6, 20, 42],
      stroked: false,
    }),
    new GeoJsonLayer({
      id: "countries",
      data: COUNTRIES,
      stroked: true,
      filled: true,
      getFillColor: [17, 50, 86, 255],
      getLineColor: [41, 181, 232, 70],
      lineWidthMinPixels: 0.6,
    }),
    new ArcLayer({
      id: "arcs",
      data: arcs,
      getSourcePosition: (d: { from: CityPoint }) => [d.from.lon, d.from.lat],
      getTargetPosition: (d: { to: CityPoint }) => [d.to.lon, d.to.lat],
      getSourceColor: [41, 181, 232, 200],
      getTargetColor: (d: { i: number }) => {
        const a = Math.round(120 + 135 * Math.abs(Math.sin((phase + d.i / 12) * Math.PI)))
        return [113, 211, 220, a]
      },
      getWidth: 1.6,
      getHeight: 0.35,
      greatCircle: true,
      updateTriggers: { getTargetColor: phase },
    }),
    new ScatterplotLayer({
      id: "halo",
      data: ciudades,
      getPosition: (d: CityPoint) => [d.lon, d.lat],
      getRadius: (d: CityPoint) => 60000 + 340000 * (d.ventas / maxVentas) * (0.75 + 0.25 * Math.sin(phase * 2 * Math.PI)),
      getFillColor: (d: CityPoint) => (d.ciudad === selected ? [255, 159, 54, 70] : [41, 181, 232, 45]),
      radiusUnits: "meters",
      updateTriggers: { getRadius: phase, getFillColor: selected },
    }),
    new ColumnLayer({
      id: "ventas",
      data: ciudades,
      diskResolution: 18,
      radius: 85000,
      extruded: true,
      pickable: true,
      elevationScale: 1,
      getPosition: (d: CityPoint) => [d.lon, d.lat],
      getElevation: (d: CityPoint) => 60000 + 900000 * (d.ventas / maxVentas),
      getFillColor: (d: CityPoint) => {
        if (d.ciudad === selected) return [255, 159, 54, 255]
        const t = d.ventas / maxVentas
        return [Math.round(41 + 72 * t), Math.round(181 + 30 * t), Math.round(232 - 12 * t), 235]
      },
      updateTriggers: { getFillColor: selected },
      onClick: (info: PickingInfo<CityPoint>) => onSelect?.(info.object?.ciudad === selected ? null : info.object?.ciudad ?? null),
    }),
  ]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[18px]">
      <DeckGL
        views={new GlobeView({ resolution: 10 })}
        viewState={viewState}
        controller={{ scrollZoom: { speed: 0.01, smooth: true } }}
        onViewStateChange={({ viewState: vs, interactionState }) => {
          const s = interactionState as { isDragging?: boolean; isZooming?: boolean; inTransition?: boolean } | undefined
          setInteracting(Boolean(s?.isDragging || s?.isZooming))
          setViewState(vs as typeof viewState)
        }}
        layers={layers}
        getTooltip={({ object }: PickingInfo<CityPoint>) =>
          object
            ? {
            html: `<div style="font-family:inherit"><div style="font-weight:700;font-size:13px">${object.ciudad}, ${object.pais}</div>
              <div style="color:#71D3DC;font-size:12px;margin-top:2px">${fmtMoney(object.ventas)} en ventas</div>
              <div style="color:#8aa4c8;font-size:11px">${object.ordenes.toLocaleString("es-CO")} ordenes · ticket ${fmtMoney(object.ventas / Math.max(1, object.ordenes), 2)}</div></div>`,
              style: { background: "rgba(7,20,40,0.95)", border: "1px solid rgba(41,181,232,0.4)", borderRadius: "10px", padding: "8px 10px", color: "#e6f1ff" },
              }
            : null
        }
      />
      <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-3 text-[11px] text-[#8aa4c8]">
        <span className="inline-block h-2 w-6 rounded bg-gradient-to-r from-[#29B5E8] to-[#71D3DC]" />
        Altura = ventas del anio · clic en una columna para filtrar
      </div>
    </div>
  )
}
