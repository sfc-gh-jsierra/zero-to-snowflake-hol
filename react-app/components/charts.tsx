"use client"

import ReactECharts from "echarts-for-react"
import { graphic } from "echarts"
import type { BrandPoint, HeatCell, SentimentPoint, TrendPoint } from "@/lib/types"
import { DAYS_ES, MONTHS_ES, fmtMoney } from "@/lib/format"

const AXIS = { color: "#8aa4c8", fontSize: 11 }
const SPLIT = { lineStyle: { color: "rgba(41,181,232,0.08)" } }
const TOOLTIP = {
  backgroundColor: "rgba(7,20,40,0.95)",
  borderColor: "rgba(41,181,232,0.4)",
  textStyle: { color: "#e6f1ff", fontSize: 12 },
}

export function TrendChart({ data, anio }: { data: TrendPoint[]; anio: number }) {
  const option = {
    grid: { left: 52, right: 16, top: 16, bottom: 28 },
    tooltip: { ...TOOLTIP, trigger: "axis", valueFormatter: (v: number) => fmtMoney(v) },
    xAxis: { type: "category", data: data.map((d) => d.mes.slice(0, 7)), axisLabel: AXIS, axisLine: { lineStyle: { color: "#1c3558" } } },
    yAxis: { type: "value", axisLabel: { ...AXIS, formatter: (v: number) => fmtMoney(v) }, splitLine: SPLIT },
    series: [
      {
        type: "line",
        smooth: true,
        symbol: "none",
        data: data.map((d) => d.ventas),
        lineStyle: { width: 2.5, color: "#29B5E8", shadowBlur: 12, shadowColor: "rgba(41,181,232,0.6)" },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(41,181,232,0.45)" },
            { offset: 1, color: "rgba(41,181,232,0)" },
          ]),
        },
        markArea: {
          itemStyle: { color: "rgba(255,159,54,0.08)" },
          data: [[{ xAxis: `${anio}-01` }, { xAxis: data.filter((d) => d.mes.startsWith(String(anio))).at(-1)?.mes.slice(0, 7) ?? `${anio}-12` }]],
        },
      },
    ],
    animationDuration: 1400,
  }
  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
}

export function BrandsChart({ data, onSelect, selected }: { data: BrandPoint[]; onSelect?: (m: string | null) => void; selected?: string | null }) {
  const top = [...data].slice(0, 10).reverse()
  const option = {
    grid: { left: 130, right: 56, top: 6, bottom: 6 },
    tooltip: { ...TOOLTIP, trigger: "item", formatter: (p: { name: string; value: number; data: { tipo: string } }) => `<b>${p.name}</b><br/>${p.data.tipo}<br/>${fmtMoney(p.value)}` },
    xAxis: { type: "value", show: false },
    yAxis: { type: "category", data: top.map((d) => d.marca), axisLabel: { ...AXIS, color: "#cfe3ff" }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        type: "bar",
        barWidth: 12,
        data: top.map((d) => ({
          value: d.ventas,
          tipo: d.tipoMenu,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color:
              d.marca === selected
                ? "#FF9F36"
                : new graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: "#11567F" },
                    { offset: 1, color: "#29B5E8" },
                  ]),
          },
        })),
        label: { show: true, position: "right", color: "#8aa4c8", fontSize: 11, formatter: (p: { value: number }) => fmtMoney(p.value) },
        showBackground: true,
        backgroundStyle: { color: "rgba(41,181,232,0.05)", borderRadius: [0, 8, 8, 0] },
      },
    ],
    animationDuration: 1200,
  }
  return (
    <ReactECharts
      option={option}
      style={{ height: "100%", width: "100%" }}
      notMerge
      onEvents={{ click: (p: { name: string }) => onSelect?.(p.name === selected ? null : p.name) }}
    />
  )
}

export function HeatmapChart({ data }: { data: HeatCell[] }) {
  const max = Math.max(1, ...data.map((d) => d.ventas))
  const option = {
    grid: { left: 40, right: 12, top: 8, bottom: 40 },
    tooltip: {
      ...TOOLTIP,
      formatter: (p: { value: [number, number, number] }) => `${DAYS_ES[p.value[1]]} · ${MONTHS_ES[p.value[0]]}<br/><b>${fmtMoney(p.value[2])}</b>`,
    },
    xAxis: { type: "category", data: MONTHS_ES, axisLabel: AXIS, splitArea: { show: false }, axisLine: { show: false } },
    yAxis: { type: "category", data: DAYS_ES, axisLabel: AXIS, axisLine: { show: false } },
    visualMap: {
      min: 0,
      max,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemHeight: 120,
      itemWidth: 10,
      textStyle: { color: "#8aa4c8", fontSize: 10 },
      formatter: (v: number) => fmtMoney(v),
      inRange: { color: ["#0b1d38", "#11567F", "#29B5E8", "#71D3DC", "#FF9F36"] },
    },
    series: [
      {
        type: "heatmap",
        data: data.map((d) => [d.mes - 1, d.dia - 1, d.ventas]),
        itemStyle: { borderRadius: 4, borderColor: "#050b18", borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(41,181,232,0.7)" } },
      },
    ],
    animationDuration: 900,
  }
  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
}

export function SentimentChart({ data }: { data: SentimentPoint[] }) {
  const rows = [...data]
    .map((d) => ({ ...d, total: d.positivas + d.negativas + d.neutras }))
    .sort((a, b) => b.positivas / b.total - a.positivas / a.total)
  const pct = (n: number, t: number) => Math.round((1000 * n) / Math.max(1, t)) / 10
  const option = {
    grid: { left: 130, right: 16, top: 26, bottom: 6 },
    legend: { top: 0, right: 0, textStyle: { color: "#8aa4c8", fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
    xAxis: { type: "value", max: 100, show: false },
    yAxis: { type: "category", inverse: true, data: rows.map((r) => r.marca), axisLabel: { ...AXIS, color: "#cfe3ff" }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: "Positivas", type: "bar", stack: "s", barWidth: 10, data: rows.map((r) => pct(r.positivas, r.total)), itemStyle: { color: "#22c55e" } },
      { name: "Neutras/Mixtas", type: "bar", stack: "s", data: rows.map((r) => pct(r.neutras, r.total)), itemStyle: { color: "#475b7a" } },
      { name: "Negativas", type: "bar", stack: "s", data: rows.map((r) => pct(r.negativas, r.total)), itemStyle: { color: "#f43f5e", borderRadius: [0, 6, 6, 0] } },
    ],
    animationDuration: 1100,
  }
  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
}
