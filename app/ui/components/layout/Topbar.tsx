"use client"

import { usePathname } from "next/navigation"

// Mapa de rutas → título legible
// Extendé esto a medida que agregués módulos
const PAGE_TITLES: Record<string, string> = {
  "/protected/dashboard":              "Dashboard",
  "/protected/dashboard/agentes":      "Agentes",
  "/protected/dashboard/unidades":      "Unidades",
  "/protected/dashboard/turnos":       "Turnos",
  "/protected/dashboard/cursos":       "Cursos",
  "/protected/dashboard/comisiones":    "Comisiones",
  "/protected/dashboard/materias":     "Materias",
  "/protected/dashboard/distribuciones": "Distribuciones",
  "/protected/dashboard/codigarios":   "Codigarios",
  "/protected/dashboard/modulosHorarios": "Módulos de Horarios",
  "/protected/dashboard/asignaciones": "Asignaciones",
  "/protected/dashboard/incidencias":  "Incidencias",

}

interface TopbarProps {
  // Permite override manual desde DashboardLayout si hace falta
  pageTitle?: string
  // TODO: reemplazar con datos reales del usuario autenticado
  // cuando implementes el contexto de sesión
  userName?: string
}

export function Topbar({ pageTitle, userName = "Usuario" }: TopbarProps) {
  const pathname  = usePathname()
  const autoTitle = PAGE_TITLES[pathname] ?? "Dashboard"
  const title     = pageTitle ?? autoTitle

  return (
    <header
      style={{
        height:          "var(--topbar-height)",
        background:      "var(--color-surface)",
        borderBottom:    "1px solid var(--color-border)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "0 var(--space-6)",
        position:        "fixed",
        top:             0,
        left:            "var(--sidebar-width)",
        right:           0,
        zIndex:          "var(--z-topbar)",
      }}
    >

      {/* Título de la sección actual */}
      <span
        style={{
          fontSize:   "var(--text-sm)",
          fontWeight: "var(--font-medium)",
          color:      "var(--color-text-primary)",
        }}
      >
        {title}
      </span>

      {/* Zona derecha: usuario */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "var(--space-3)",
        }}
      >
        {/* Avatar con iniciales */}
        <div
          style={{
            width:          32,
            height:         32,
            borderRadius:   "50%",
            background:     "var(--color-primary-subtle)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       "var(--text-2xs)",
            fontWeight:     "var(--font-medium)",
            color:          "var(--color-primary)",
            flexShrink:     0,
          }}
          aria-hidden="true"
        >
          {userName
            .split(" ")
            .slice(0, 2)
            .map(n => n[0])
            .join("")
            .toUpperCase()}
        </div>

        <span
          style={{
            fontSize: "var(--text-sm)",
            color:    "var(--color-text-secondary)",
          }}
        >
          {userName}
        </span>
      </div>

    </header>
  )
}
