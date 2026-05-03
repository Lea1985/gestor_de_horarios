import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

// ── Tipografía ───────────────────────────────────────────────
// Solo una fuente en el body para evitar hydration mismatch.
// Geist Mono se usa via var(--font-mono) en globals.css cuando
// se necesita en componentes específicos (tablas, inputs de código).
const geistSans = Geist({
  subsets:  ["latin"],
  variable: "--font-geist-sans",
})

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
      <body className={geistSans.variable} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
