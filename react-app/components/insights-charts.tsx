"use client"

import ReactECharts from "echarts-for-react"
import type { FlowPoint, HourPoint, ItemPoint } from "@/lib/types"
import { fmtMoney, fmtNumber } from "@/lib/format"

const AXIS = { color: "#8aa4c8", fontSize: 11 }
const SPLIT = { lineStyle: { color: "rgba(41,181,232,0.08)" } }
const TOOLTIP = {
  backgroundColor: "rgba(7,20,40,0.95)",
  borderColor: "rgba(41,181,232,0.4)",
  textStyle: { color: "#e6f1ff", fontSize: 12 },
}
const COLORS = ["#29B5E8", "#FF9F36", "#71D3DC", "#7D44CF", "#D45B90", "#8FD378", "#FFD54F", "#5A8CFF"]
const style = { height: "100%", width: "100%" }

export function MenuTreemap({ data }: { data: ItemPoint[] }) {
  const cats = [...new Set(data.map((d) => d.categoria))]
  const option = {
    color: COLORS,
    tooltip: { ...TOOLTIP, formatter: (p: { name: string; value: number }) => `<b>${p.name}</b><br/>${fmtMoney(p.value)}` },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: "zoomToNode",
        breadcrumb: { itemStyle: { color: "#0b1e3a", borderColor: "#29B5E8" }, textStyle: { color: "#cfe3ff" } },
        label: { color: "#fff", fontSize: 11, overflow: "truncate" },
        upperLabel: { show: true, height: 22, color: "#fff", fontWeight: "bold" },
        itemStyle: { borderColor: "#050b18", borderWidth: 2, gapWidth: 2 },
        levels: [{ itemStyle: { borderWidth: 3, gapWidth: 3 } }, { colorSaturation: [0.35, 0.6] }],
        data: cats.map((c, i) => ({
          name: c,
          itemStyle: { color: COLORS[i % COLORS.length] },
          children: data.filter((d) => d.categoria === c).slice(0, 25).map((d) => ({ name: d.item, value: d.ventas })),
        })),
      },
    ],
  }
  return <ReactECharts option={option} style={style} notMerge />
}

export function FlowSankey({ data }: { data: FlowPoint[] }) {
  const paises = [...new Set(data.map((d) => d.pais))]
  const tipos = [...new Set(data.map((d) => d.tipoMenu))]
  const option = {
    color: COLORS,
    tooltip: { ...TOOLTIP, trigger: "item", valueFormatter: (v: number) => fmtMoney(v) },
    series: [
      {
        type: "sankey",
        left: 8,
        right: 110,
        top: 8,
        bottom: 8,
        nodeGap: 6,
        emphasis: { focus: "adjacency" },
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.35 },
        label: { color: "#cfe3ff", fontSize: 10 },
        data: [...paises.map((name) => ({ name })), ...tipos.map((name) => ({ name, itemStyle: { color: "#FF9F36" } }))],
        links: data.map((d) => ({ source: d.pais, target: d.tipoMenu, value: d.ventas })),
      },
    ],
  }
  return <ReactECharts option={option} style={style} notMerge />
}

export function DemandClock({ data }: { data: HourPoint[] }) {
  const horas = [...new Set(data.map((d) => d.hora))].sort((a, b) => a - b)
  const top = [...new Set(data.map((d) => d.marca))]
    .map((m) => ({ m, v: data.filter((d) => d.marca === m).reduce((s, d) => s + d.ventas, 0) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((x) => x.m)
  const option = {
    color: COLORS,
    tooltip: { ...TOOLTIP, valueFormatter: (v: number) => fmtMoney(v) },
    legend: { bottom: 0, textStyle: { color: "#cfe3ff", fontSize: 10 }, itemWidth: 10, itemHeight: 8 },
    angleAxis: { type: "category", data: horas.map((h) => `${h}h`), axisLabel: AXIS, axisLine: { lineStyle: { color: "#1c3558" } } },
    radiusAxis: { axisLabel: { show: false }, splitLine: SPLIT, axisLine: { show: false } },
    polar: { radius: ["12%", "72%"], center: ["50%", "46%"] },
    series: top.map((m) => ({
      type: "bar",
      coordinateSystem: "polar",
      stack: "total",
      name: m,
      emphasis: { focus: "series" },
      data: horas.map((h) => data.filter((d) => d.marca === m && d.hora === h).reduce((s, d) => s + d.ventas, 0)),
    })),
    animationDuration: 1600,
  }
  return <ReactECharts option={option} style={style} notMerge />
}

export function PriceBubbles({ data }: { data: ItemPoint[] }) {
  const cats = [...new Set(data.map((d) => d.categoria))]
  const max = Math.max(1, ...data.map((d) => d.ventas))
  const option = {
    color: COLORS,
    grid: { left: 64, right: 20, top: 30, bottom: 40 },
    legend: { top: 0, textStyle: { color: "#cfe3ff", fontSize: 10 } },
    tooltip: {
      ...TOOLTIP,
      formatter: (p: { data: [number, number, number, string] }) =>
        `<b>${p.data[3]}</b><br/>Precio prom: ${fmtMoney(p.data[1], 2)}<br/>Unidades: ${fmtNumber(p.data[0])}<br/>Ventas: ${fmtMoney(p.data[2])}`,
    },
    xAxis: { type: "log", name: "Unidades", nameTextStyle: AXIS, axisLabel: { ...AXIS, formatter: (v: number) => fmtNumber(v) }, splitLine: SPLIT },
    yAxis: { type: "value", name: "Precio", nameTextStyle: AXIS, axisLabel: { ...AXIS, formatter: (v: number) => `$${v}` }, splitLine: SPLIT },
    series: cats.map((c) => ({
      name: c,
      type: "scatter",
      data: data.filter((d) => d.categoria === c).map((d) => [d.unidades, d.precio, d.ventas, d.item]),
      symbolSize: (v: number[]) => 6 + Math.sqrt(v[2] / max) * 46,
      itemStyle: { opacity: 0.75, shadowBlur: 10, shadowColor: "rgba(41,181,232,0.4)" },
    })),
  }
  return <ReactECharts option={option} style={style} notMerge />
}
