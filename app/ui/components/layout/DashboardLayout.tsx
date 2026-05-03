"use client"

import { Sidebar } from "./Sidebar"
import { Topbar }  from "./Topbar"

interface DashboardLayoutProps {
  children:     React.ReactNode
  pageTitle?:   string  // título que muestra el Topbar
}

export function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* Sidebar fijo a la izquierda */}
      <Sidebar />

      {/* Columna derecha: topbar + contenido */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: "var(--sidebar-width)",
          minWidth: 0, // evita overflow en flex
        }}
      >
        <Topbar pageTitle={pageTitle} />

        <main
          style={{
            flex: 1,
            padding: "var(--space-6)",
            background: "var(--color-bg)",
            marginTop: "var(--topbar-height)",
          }}
        >
          {children}
        </main>
      </div>

    </div>
  )
}
