import type { Metadata } from "next"
import type React from "react"
import { QueryProvider } from "@/components/query-provider"
import { APP_TITLE, LOGO_SRC } from "@/lib/constants"
import "./globals.css"

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "Centro de mando de Tasty Bytes: ventas globales, clientes y un agente de IA de Snowflake CoWork",
  icons: { icon: LOGO_SRC },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
