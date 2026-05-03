"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useRouter } from "next/navigation"

type MetricValue = number | string

export default function DashboardPage() {
  const { authHeaders } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [metrics, setMetrics] = useState<{
    agentes: MetricValue
    asignaciones: MetricValue
    clases: MetricValue
    incidencias: MetricValue
  }>({
    agentes: "…",
    asignaciones: "…",
    clases: "…",
    incidencias: "…",
  })

  async function cargarMetricas() {
    try {
      setLoading(true)

      const [r1, r2, r3, r4] = await Promise.all([
        fetch("/api/agentes", { headers: authHeaders }),
        fetch("/api/asignaciones", { headers: authHeaders }),
        fetch("/api/clases", { headers: authHeaders }),
        fetch("/api/incidencias", { headers: authHeaders }),
      ])

      const d1 = await r1.json().catch(() => [])
      const d2 = await r2.json().catch(() => [])
      const d3 = await r3.json().catch(() => [])
      const d4 = await r4.json().catch(() => [])

      setMetrics({
        agentes: Array.isArray(d1) ? d1.length : "—",
        asignaciones: Array.isArray(d2) ? d2.length : "—",
        clases: Array.isArray(d3) ? d3.length : "—",
        incidencias: Array.isArray(d4) ? d4.length : "—",
      })
    } catch {
      setMetrics({
        agentes: "—",
        asignaciones: "—",
        clases: "—",
        incidencias: "—",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      cargarMetricas()
    }
  }, [authHeaders.Authorization])

  const cards = [
    {
      label: "Agentes",
      value: metrics.agentes,
      path: "/protected/dashboard/agentes",
    },
    {
      label: "Asignaciones",
      value: metrics.asignaciones,
      path: "/protected/dashboard/asignaciones",
    },
    {
      label: "Clases",
      value: metrics.clases,
      path: "/protected/dashboard/clases",
    },
    {
      label: "Incidencias",
      value: metrics.incidencias,
      path: "/protected/dashboard/incidencias",
    },
  ]

  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "var(--space-6)",
      }}
    >
      <div>
        <h1
          style={{
            fontSize:   "var(--text-xl)",
            fontWeight: "var(--font-medium)",
            color:      "var(--color-text-primary)",
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color:    "var(--color-text-secondary)",
            marginTop: "var(--space-1)",
          }}
        >
          Bienvenido al sistema de gestión ALNEXT
        </p>
      </div>

      {/* Cards de métricas */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap:                 "var(--space-4)",
        }}
      >
        {cards.map(({ label, value, path }) => (
          <div
            key={label}
            onClick={() => router.push(path)}
            style={{
              background:   "var(--color-surface)",
              border:       "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding:      "var(--space-4)",
              cursor:       "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-surface-raised)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-surface)"
            }}
          >
            <div
              style={{
                fontSize:      "var(--text-2xs)",
                fontWeight:    "var(--font-medium)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color:         "var(--color-text-hint)",
                marginBottom:  "var(--space-2)",
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize:   "var(--text-xl)",
                fontWeight: "var(--font-medium)",
                color:      "var(--color-text-primary)",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}