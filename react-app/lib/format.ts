const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 })

/** $1,2 mil M style for big numbers, exact with decimals for small ones */
export function fmtMoney(n: number, decimals?: number): string {
  if (decimals !== undefined) return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  return `$${compact.format(n)}`
}

export function fmtNumber(n: number): string {
  return compact.format(n)
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`
}

export const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
export const DAYS_ES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]
