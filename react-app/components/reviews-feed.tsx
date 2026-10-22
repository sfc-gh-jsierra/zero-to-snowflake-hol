"use client"

import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Frown, Meh, Smile } from "lucide-react"
import type { Review } from "@/lib/types"

const SENT = {
  positive: { icon: Smile, color: "#22c55e", label: "Positiva" },
  negative: { icon: Frown, color: "#f43f5e", label: "Negativa" },
  neutral: { icon: Meh, color: "#8aa4c8", label: "Neutra" },
  mixed: { icon: Meh, color: "#FF9F36", label: "Mixta" },
} as const

export function ReviewsFeed({ marca }: { marca: string | null }) {
  const { data, isLoading, error } = useQuery<Review[]>({
    queryKey: ["reviews", marca],
    queryFn: async () => {
      const res = await fetch(`/api/reviews${marca ? `?marca=${encodeURIComponent(marca)}` : ""}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Error")
      return json
    },
  })

  if (isLoading) return <div className="p-4 text-xs text-[#8aa4c8]">Cargando reviews…</div>
  if (error) return <div className="p-4 text-xs text-rose-300">{(error as Error).message}</div>

  return (
    <div className="scroll-thin h-full space-y-2 overflow-y-auto pr-1">
      {data?.map((r, i) => {
        const s = SENT[r.sentimiento as keyof typeof SENT] ?? SENT.neutral
        const Icon = s.icon
        return (
          <motion.div
            key={`${r.fecha}-${i}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.03 }}
            className="rounded-xl border border-[rgba(41,181,232,0.1)] bg-[#06142a]/60 p-3"
          >
            <div className="mb-1 flex items-center gap-2 text-[11px]">
              <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
              <span className="font-semibold text-[#cfe3ff]">{r.marca}</span>
              <span className="text-[#8aa4c8]">· {r.ciudad}</span>
              <span className="ml-auto text-[#5f7aa0]">{r.fecha}</span>
            </div>
            <p className="line-clamp-3 text-xs leading-relaxed text-[#b8cbe6]">{r.review}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
