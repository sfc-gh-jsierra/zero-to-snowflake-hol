"use client"

import { useEffect, useRef, useState } from "react"
import { animate, motion } from "framer-motion"
import { DollarSign, MapPin, Receipt, ShoppingBag, Truck } from "lucide-react"
import type { Kpis } from "@/lib/types"
import { fmtMoney, fmtNumber, fmtPct } from "@/lib/format"

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay,
    })
    prev.current = value
    return () => controls.stop()
  }, [value])
  return <>{format(display)}</>
}

export function KpiCards({ kpis, anio }: { kpis: Kpis; anio: number }) {
  const growth = kpis.ventasAnterior > 0 ? ((kpis.ventas - kpis.ventasAnterior) / kpis.ventasAnterior) * 100 : null
  const cards = [
    { label: `Ventas ${anio}`, value: kpis.ventas, fmt: (n: number) => fmtMoney(n), icon: DollarSign, accent: "#29B5E8",
      sub: growth === null ? "primer anio de datos" : `${fmtPct(growth)} vs mismo periodo ${anio - 1}`, good: (growth ?? 0) >= 0 },
    { label: "Ordenes", value: kpis.ordenes, fmt: (n: number) => fmtNumber(n), icon: ShoppingBag, accent: "#71D3DC", sub: "transacciones POS" },
    { label: "Ticket promedio", value: kpis.ticket, fmt: (n: number) => fmtMoney(n, 2), icon: Receipt, accent: "#FF9F36", sub: "USD por orden" },
    { label: "Camiones activos", value: kpis.camiones, fmt: (n: number) => Math.round(n).toString(), icon: Truck, accent: "#7D44CF", sub: "food trucks con ventas" },
    { label: "Ciudades", value: kpis.ciudades, fmt: (n: number) => Math.round(n).toString(), icon: MapPin, accent: "#22c55e", sub: "en 15 paises" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.5 }}
          className="glass relative overflow-hidden p-4"
        >
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl" style={{ background: c.accent }} />
          <div className="flex items-center justify-between">
            <span className="panel-title">{c.label}</span>
            <c.icon className="h-4 w-4" style={{ color: c.accent }} />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">
            <CountUp value={c.value} format={c.fmt} />
          </div>
          <div className={`mt-1 text-xs ${c.good === false ? "text-rose-400" : c.good ? "text-emerald-400" : "text-[#8aa4c8]"}`}>{c.sub}</div>
        </motion.div>
      ))}
    </div>
  )
}
