import { querySnowflake } from "@/lib/snowflake"
import type { Review } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const marca = new URL(req.url).searchParams.get("marca")
  try {
    const rows = await querySnowflake(
      `SELECT marca, ciudad, sentimiento, fecha, review
       FROM TB_101.ANALYTICS.REVIEWS_SENTIMIENTO
       WHERE (? IS NULL OR marca = ?)
       ORDER BY fecha DESC
       LIMIT 40`,
      { binds: [marca, marca] },
    )
    const reviews: Review[] = rows.map((r) => ({
      marca: r.MARCA,
      ciudad: r.CIUDAD,
      sentimiento: r.SENTIMIENTO,
      fecha: r.FECHA instanceof Date ? r.FECHA.toISOString().slice(0, 10) : String(r.FECHA).slice(0, 10),
      review: String(r.REVIEW).trim(),
    }))
    return Response.json(reviews)
  } catch (e) {
    console.error(new Date().toISOString(), "[reviews] query failed", e)
    return Response.json({ error: e instanceof Error ? e.message : "Reviews query failed" }, { status: 500 })
  }
}
