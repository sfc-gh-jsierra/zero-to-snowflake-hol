import { querySnowflake } from "@/lib/snowflake"
import { DEFAULT_YEAR, YEARS } from "@/lib/constants"
import type { InsightsData } from "@/lib/types"

export const dynamic = "force-dynamic"

const T = "TB_101.ANALYTICS"

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("anio") ?? DEFAULT_YEAR)
  const anio = (YEARS as readonly number[]).includes(raw) ? raw : DEFAULT_YEAR

  try {
    const [hora, items, flujo] = await Promise.all([
      // Hourly pulse is pre-aggregated for 2022 (ventas_hora_ciudad)
      querySnowflake(
        `SELECT ciudad, hora, marca, ordenes, ventas, camiones FROM ${T}.ventas_hora_ciudad`,
      ),
      querySnowflake(
        `SELECT categoria_item, item_menu, SUM(ventas) AS ventas, SUM(unidades) AS unidades,
                SUM(ventas) / NULLIF(SUM(unidades), 0) AS precio
         FROM ${T}.ventas_items_mes WHERE YEAR(mes) = ? GROUP BY ALL ORDER BY ventas DESC`,
        { binds: [anio] },
      ),
      querySnowflake(
        `SELECT pais, tipo_menu, SUM(ventas) AS ventas
         FROM ${T}.ventas_items_mes WHERE YEAR(mes) = ? GROUP BY ALL`,
        { binds: [anio] },
      ),
    ])

    const data: InsightsData = {
      anio,
      hora: hora.map((r) => ({
        ciudad: r.CIUDAD,
        hora: Number(r.HORA),
        marca: r.MARCA,
        ordenes: Number(r.ORDENES),
        ventas: Number(r.VENTAS),
        camiones: Number(r.CAMIONES),
      })),
      items: items.map((r) => ({
        categoria: r.CATEGORIA_ITEM,
        item: r.ITEM_MENU,
        ventas: Number(r.VENTAS),
        unidades: Number(r.UNIDADES),
        precio: Number(r.PRECIO),
      })),
      flujo: flujo.map((r) => ({ pais: r.PAIS, tipoMenu: r.TIPO_MENU, ventas: Number(r.VENTAS) })),
    }
    return Response.json(data)
  } catch (e) {
    console.error(new Date().toISOString(), "[insights] query failed", e)
    return Response.json({ error: e instanceof Error ? e.message : "Insights query failed" }, { status: 500 })
  }
}
