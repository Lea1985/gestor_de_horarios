import type { Metadata } from "next"
import "./globals.css"

// ── Tipografía ───────────────────────────────────────────────
// Fuente del sistema operativo (ver --font-sans en globals.css) en vez
// de next/font/google: evita que "next build" dependa de una descarga
// de Google Fonts, necesario para instalaciones sin internet.

export const metadata: Metadata = {
  title:       "ALNEXT",
  description: "Sistema de gestión ALNEXT",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
