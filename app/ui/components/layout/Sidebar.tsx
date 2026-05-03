"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogoutButton } from "@/app/ui"

const MAIN_ITEMS = [
  { label: "Dashboard", href: "/protected/dashboard" },
  { label: "Agentes", href: "/protected/dashboard/agentes" },
  { label: "Asignaciones", href: "/protected/dashboard/asignaciones" },
  { label: "Incidencias", href: "/protected/dashboard/incidencias" },
]

const ACADEMIC_ITEMS = [
  { label: "Unidades", href: "/protected/dashboard/unidades" },
  { label: "Turnos", href: "/protected/dashboard/turnos" },
  { label: "Cursos", href: "/protected/dashboard/cursos" },
  { label: "Comisiones", href: "/protected/dashboard/comisiones" },
  { label: "Materias", href: "/protected/dashboard/materias" },

]

const CONFIG_ITEMS = [
  {
    label: "Módulos de Horarios",
    href: "/protected/dashboard/modulosHorarios",
  },
  {
    label: "Distribuciones",
    href: "/protected/dashboard/distribuciones",
  },
  {
    label: "Codigarios",
    href: "/protected/dashboard/codigarios",
  },
]

function NavLink({
  label,
  href,
  pathname,
  nested = false,
}: {
  label: string
  href: string
  pathname: string
  nested?: boolean
}) {
  const isActive =
    href === "/protected/dashboard"
      ? pathname === href
      : pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-3)",
        paddingLeft: nested
          ? "calc(var(--space-3) + 12px)"
          : "var(--space-3)",
        borderRadius: "var(--radius-lg)",
        fontSize: "var(--text-sm)",
        fontWeight: isActive
          ? "var(--font-medium)"
          : "var(--font-regular)",
        color: isActive
          ? "white"
          : "rgba(241, 245, 249, 0.65)",
        background: isActive
          ? "rgba(30, 155, 184, 0.2)"
          : "transparent",
        textDecoration: "none",
        transition: "all 0.15s ease",
        borderLeft: isActive
          ? "2px solid var(--color-accent)"
          : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background =
            "rgba(255,255,255,0.06)"
          e.currentTarget.style.color = "white"
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent"
          e.currentTarget.style.color =
            "rgba(241, 245, 249, 0.65)"
        }
      }}
    >
      {label}
    </Link>
  )
}

function Section({
  title,
  open,
  setOpen,
  children,
}: {
  title: string
  open: boolean
  setOpen: (value: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "var(--space-2) var(--space-3)",
          border: "none",
          background: "transparent",
          color: "rgba(241, 245, 249, 0.65)",
          fontSize: "11px",
          fontWeight: "var(--font-medium)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontSize: "10px",
            transition: "transform 0.15s ease",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
      </button>

      {open && children}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  const [academicOpen, setAcademicOpen] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        background: "var(--color-primary)",
        color: "var(--color-text-on-dark)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: "var(--z-sidebar)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          marginBottom: "var(--space-2)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: "rgba(30, 155, 184, 0.15)",
            border: "1px solid rgba(30, 155, 184, 0.3)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2L2 16h16L10 2z"
              stroke="#1E9BB8"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M10 6L6 14h8L10 6z"
              fill="rgba(30,155,184,0.3)"
              stroke="#1E9BB8"
              strokeWidth="0.8"
            />
          </svg>
        </div>

        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            letterSpacing: "0.12em",
            color: "var(--color-text-on-dark)",
          }}
        >
          ALNEXT
        </span>
      </div>

      {/* Navegación */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {MAIN_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            pathname={pathname}
          />
        ))}

        <div style={{ height: 8 }} />

        <Section
          title="Académico"
          open={academicOpen}
          setOpen={setAcademicOpen}
        >
          {ACADEMIC_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              pathname={pathname}
              nested
            />
          ))}
        </Section>

        <Section
          title="Configuración"
          open={configOpen}
          setOpen={setConfigOpen}
        >
          {CONFIG_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              pathname={pathname}
              nested
            />
          ))}
        </Section>
      </nav>

      {/* Logout */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "var(--space-4)",
        }}
      >
        <LogoutButton />
      </div>
    </aside>
  )
}