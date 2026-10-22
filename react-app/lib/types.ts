/** Shared response shapes between API routes and client components */

export interface Kpis {
  ventas: number
  ordenes: number
  ticket: number
  camiones: number
  ciudades: number
  ventasAnterior: number
}

export interface CityPoint {
  ciudad: string
  pais: string
  lat: number
  lon: number
  ventas: number
  ordenes: number
}

export interface TrendPoint {
  mes: string
  ventas: number
}

export interface BrandPoint {
  marca: string
  tipoMenu: string
  ventas: number
}

export interface HeatCell {
  dia: number
  mes: number
  ventas: number
}

export interface SentimentPoint {
  marca: string
  positivas: number
  negativas: number
  neutras: number
}

export interface DashboardData {
  anio: number
  kpis: Kpis
  ciudades: CityPoint[]
  tendencia: TrendPoint[]
  marcas: BrandPoint[]
  heatmap: HeatCell[]
  sentimiento: SentimentPoint[]
}

export interface HourPoint {
  ciudad: string
  hora: number
  marca: string
  ordenes: number
  ventas: number
  camiones: number
}

export interface ItemPoint {
  categoria: string
  item: string
  ventas: number
  unidades: number
  precio: number
}

export interface FlowPoint {
  pais: string
  tipoMenu: string
  ventas: number
}

export interface InsightsData {
  anio: number
  hora: HourPoint[]
  items: ItemPoint[]
  flujo: FlowPoint[]
}

export interface Review {
  marca: string
  ciudad: string
  sentimiento: string
  fecha: string
  review: string
}

/** Events the /api/agent route streams to the browser (one JSON object per SSE `data:`) */
export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "thinking"; text: string }
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input?: unknown }
  | { type: "tool_result"; id: string; name: string; sql?: string; status?: string }
  | { type: "chart"; spec: string }
  | { type: "table"; columns: string[]; rows: unknown[][] }
  | { type: "citations"; items: { title: string; text: string }[] }
  | { type: "done" }
  | { type: "error"; message: string }
