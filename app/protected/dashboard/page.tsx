// app/protected/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useRouter } from "next/navigation"
import { TimelineCoberturaChart } from "@/app/ui/components/dashboard/TimelineCoberturaChart"
import { CoberturaDonut } from "@/features/dashboard/components/CoberturaDonut"

type MetricValue = number | string

type TimelineItem = {
  fecha: string
  total: number
  normales: number
  reemplazadas: number
  sinCobertura: number
  suspendidas: number
  coberturaPorcentaje: number
}

type DashboardKPIs = {
  clasesHoy: MetricValue
  reemplazosActivos: MetricValue
  suspendidasHoy: MetricValue
  sinCoberturaHoy: MetricValue
  incidenciasActivas: MetricValue
  coberturaPorcentaje: MetricValue
}

export default function DashboardPage() {

  const { authHeaders } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [coberturaDetalle, setCoberturaDetalle] = useState(null)

  const [metrics, setMetrics] = useState<DashboardKPIs>({
    clasesHoy: "…",
    reemplazosActivos: "…",
    suspendidasHoy: "…",
    sinCoberturaHoy: "…",
    incidenciasActivas: "…",
    coberturaPorcentaje: "…",
  })

  async function cargarMetricas() {
    try {
      setLoading(true)
      const response = await fetch("/api/dashboard/overview", {
        headers: authHeaders,
      })
      const data = await response.json()

      setMetrics(data.kpis ?? {
        clasesHoy: "—",
        reemplazosActivos: "—",
        suspendidasHoy: "—",
        sinCoberturaHoy: "—",
        incidenciasActivas: "—",
        coberturaPorcentaje: "—",
      })

      setCoberturaDetalle(data.coberturaDetalle ?? null)
      setTimeline(data.timeline ?? [])
    } catch {
      setMetrics({
        clasesHoy: "—",
        reemplazosActivos: "—",
        suspendidasHoy: "—",
        sinCoberturaHoy: "—",
        incidenciasActivas: "—",
        coberturaPorcentaje: "—",
      })
      setCoberturaDetalle(null)
      setTimeline([])
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
      label: "Clases hoy",
      value: metrics.clasesHoy,
      path: "/protected/dashboard/clases",
    },
    {
      label: "Reemplazos activos",
      value: metrics.reemplazosActivos,
      path: "/protected/dashboard/reemplazos",
    },
    {
      label: "Suspendidas hoy",
      value: metrics.suspendidasHoy,
      path: "/protected/dashboard/clases",
    },
    {
      label: "Sin cobertura",
      value: metrics.sinCoberturaHoy,
      path: "/protected/dashboard/reemplazos",
    },
    {
      label: "Incidencias activas",
      value: metrics.incidenciasActivas,
      path: "/protected/dashboard/incidencias",
    },
    {
      label: "Cobertura institucional",
      value:
        typeof metrics.coberturaPorcentaje === "number"
          ? `${metrics.coberturaPorcentaje}%`
          : metrics.coberturaPorcentaje,
      path: "/protected/dashboard/reportes",
    },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Bienvenido al sistema de gestión ALNEXT
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "var(--space-4)"
      }}>
        {cards.map(({ label, value, path }) => (
          <div
            key={label}
            onClick={() => router.push(path)}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-4)",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-surface-raised)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-surface)"
            }}
          >
            <div style={{
              fontSize: "var(--text-2xs)",
              fontWeight: "var(--font-medium)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-hint)",
              marginBottom: "var(--space-2)"
            }}>
              {label}
            </div>
            <div style={{
              fontSize: "var(--text-xl)",
              fontWeight: "var(--font-medium)",
              color: "var(--color-text-primary)"
            }}>
              {loading ? "…" : value}
            </div>
          </div>
        ))}
      </div>

      <TimelineCoberturaChart data={timeline} />

      {coberturaDetalle && (
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-4)" }}>
          <h3 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-3)" }}>Distribución de clases de hoy</h3>
          <CoberturaDonut data={coberturaDetalle} />
        </div>
      )}
    </div>
  )
}