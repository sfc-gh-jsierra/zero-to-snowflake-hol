import { querySnowflake } from "@/lib/snowflake"
import { DEFAULT_YEAR, YEARS } from "@/lib/constants"
import type { DashboardData } from "@/lib/types"

export const dynamic = "force-dynamic"

const T = "TB_101.ANALYTICS"

function toIso(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).slice(0, 10)
}

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("anio") ?? DEFAULT_YEAR)
  const anio = (YEARS as readonly number[]).includes(raw) ? raw : DEFAULT_YEAR

  try {
    const [kpi, prev, ciudades, tendencia, marcas, heat, sent] = await Promise.all([
      querySnowflake(
        `SELECT SUM(ventas) AS ventas, SUM(ordenes) AS ordenes,
                SUM(ventas) / NULLIF(SUM(ordenes), 0) AS ticket,
                COUNT(DISTINCT truck_id) AS camiones, COUNT(DISTINCT ciudad) AS ciudades
         FROM ${T}.ventas_diarias WHERE YEAR(fecha) = ?`,
        { binds: [anio] },
      ),
      // Same calendar window of the previous year, so a partial year compares fairly
      querySnowflake(
        `SELECT SUM(ventas) AS ventas FROM ${T}.ventas_diarias
         WHERE YEAR(fecha) = ? - 1
           AND DAYOFYEAR(fecha) <= (SELECT MAX(DAYOFYEAR(fecha)) FROM ${T}.ventas_diarias WHERE YEAR(fecha) = ?)`,
        { binds: [anio, anio] },
      ),
      querySnowflake(
        `SELECT c.ciudad, c.pais, c.latitud, c.longitud, SUM(v.ventas) AS ventas, SUM(v.ordenes) AS ordenes
         FROM ${T}.ventas_diarias v JOIN ${T}.ciudades c ON c.ciudad = v.ciudad
         WHERE YEAR(v.fecha) = ? GROUP BY ALL ORDER BY ventas DESC`,
        { binds: [anio] },
      ),
      querySnowflake(
        `SELECT DATE_TRUNC('month', fecha) AS mes, SUM(ventas) AS ventas
         FROM ${T}.ventas_diarias
         WHERE fecha < (SELECT DATE_TRUNC('month', MAX(fecha)) FROM ${T}.ventas_diarias)  -- excluye el mes parcial
         GROUP BY 1 ORDER BY 1`,
      ),
      querySnowflake(
        `SELECT marca, ANY_VALUE(tipo_menu) AS tipo_menu, SUM(ventas) AS ventas
         FROM ${T}.ventas_diarias WHERE YEAR(fecha) = ? GROUP BY marca ORDER BY ventas DESC`,
        { binds: [anio] },
      ),
      querySnowflake(
        `SELECT DAYOFWEEKISO(fecha) AS dia, MONTH(fecha) AS mes, SUM(ventas) AS ventas
         FROM ${T}.ventas_diarias WHERE YEAR(fecha) = ?
           AND fecha < (SELECT DATE_TRUNC('month', MAX(fecha)) FROM ${T}.ventas_diarias)
         GROUP BY ALL`,
        { binds: [anio] },
      ),
      querySnowflake(
        `SELECT marca,
                COUNT_IF(sentimiento = 'positive') AS pos,
                COUNT_IF(sentimiento = 'negative') AS neg,
                COUNT_IF(sentimiento IN ('neutral', 'mixed')) AS neu
         FROM ${T}.reviews_sentimiento GROUP BY marca ORDER BY marca`,
      ),
    ])

    const k = kpi[0] ?? {}
    const data: DashboardData = {
      anio,
      kpis: {
        ventas: Number(k.VENTAS ?? 0),
        ordenes: Number(k.ORDENES ?? 0),
        ticket: Number(k.TICKET ?? 0),
        camiones: Number(k.CAMIONES ?? 0),
        ciudades: Number(k.CIUDADES ?? 0),
        ventasAnterior: Number(prev[0]?.VENTAS ?? 0),
      },
      ciudades: ciudades.map((r) => ({
        ciudad: r.CIUDAD,
        pais: r.PAIS,
        lat: Number(r.LATITUD),
        lon: Number(r.LONGITUD),
        ventas: Number(r.VENTAS),
        ordenes: Number(r.ORDENES),
      })),
      tendencia: tendencia.map((r) => ({ mes: toIso(r.MES), ventas: Number(r.VENTAS) })),
      marcas: marcas.map((r) => ({ marca: r.MARCA, tipoMenu: r.TIPO_MENU, ventas: Number(r.VENTAS) })),
      heatmap: heat.map((r) => ({ dia: Number(r.DIA), mes: Number(r.MES), ventas: Number(r.VENTAS) })),
      sentimiento: sent.map((r) => ({
        marca: r.MARCA,
        positivas: Number(r.POS),
        negativas: Number(r.NEG),
        neutras: Number(r.NEU),
      })),
    }
    return Response.json(data)
  } catch (e) {
    console.error(new Date().toISOString(), "[dashboard] query failed", e)
    return Response.json({ error: e instanceof Error ? e.message : "Dashboard query failed" }, { status: 500 })
  }
}
