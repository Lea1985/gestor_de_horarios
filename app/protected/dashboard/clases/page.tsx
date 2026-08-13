//protected/dashboard/clases/page.tsx
"use client"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type CoberturaEstado = "NORMAL" | "REEMPLAZADA" | "SIN_COBERTURA" | "SUSPENDIDA"

type Clase = {
  id: number
  fecha: string
  estado: string
  coberturaEstado: CoberturaEstado
  unidad: { id: number; nombre: string } | null
  comision: { id: number; nombre: string } | null
  asignacion: {
    id: number
    identificadorEstructural: string
    materia: { nombre: string } | null
  } | null
  incidencia: { id: number; observacion: string | null; articulo: string | null } | null
  suplente: { nombre: string; apellido: string } | null
  modulo: { hora_desde: number; hora_hasta: number } | null
}

function formatHora(minutos?: number | null) {
  if (minutos == null) return "—"
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export default function ClasesPage() {
  const { authHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [clases, setClases] = useState<Clase[]>([])

  async function cargarClases() {
    try {
      setLoading(true)
      // Misma fuente que el Dashboard principal (obtenerClasesOperativasHoy) --
      // esta pantalla ya no calcula nada por su cuenta.
      const res = await fetch("/api/dashboard/clases-hoy", {
        headers: authHeaders,
      })
      if (!res.ok) {
        throw new Error("Error cargando clases")
      }
      const data = await res.json()
      setClases(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setClases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      cargarClases()
    }
  }, [authHeaders.Authorization])

  const metricas = useMemo(() => {
    const total = clases.length
    let reemplazadas = 0
    let suspendidas = 0
    let sinCobertura = 0
    for (const c of clases) {
      switch (c.coberturaEstado) {
        case "REEMPLAZADA":   reemplazadas++;  break
        case "SUSPENDIDA":    suspendidas++;   break
        case "SIN_COBERTURA": sinCobertura++;  break
      }
    }
    return { total, reemplazadas, suspendidas, sinCobertura }
  }, [clases])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>
          Operación diaria de clases
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Vista operativa institucional del día
        </p>
      </div>
      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        {[
          { label: "Clases del día",     value: metricas.total,        color: undefined as string | undefined },
          { label: "Reemplazos activos", value: metricas.reemplazadas, color: undefined as string | undefined },
          { label: "Suspendidas",        value: metricas.suspendidas,  color: undefined as string | undefined },
          { label: "Sin cobertura",      value: metricas.sinCobertura, color: metricas.sinCobertura > 0 ? "#dc2626" : "#16a34a" },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-4)" }}>
            <div style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", color: "var(--color-text-hint)", marginBottom: "var(--space-2)" }}>
              {card.label}
            </div>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: card.color ?? "var(--color-text-primary)" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
      {/* Tabla */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-raised)", textAlign: "left" }}>
                {["Hora", "Estado", "Materia", "Comisión", "Suplente", "Incidencia"].map(header => (
                  <th key={header} style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)", borderBottom: "1px solid var(--color-border)" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "var(--space-4)" }}>Cargando clases...</td></tr>
              ) : clases.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "var(--space-4)" }}>No hay clases para mostrar</td></tr>
              ) : (
                clases.map(clase => (
                  <tr key={clase.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "var(--space-3)" }}>
                      {formatHora(clase.modulo?.hora_desde)} - {formatHora(clase.modulo?.hora_hasta)}
                    </td>
                    <td style={{ padding: "var(--space-3)" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "999px", fontSize: "var(--text-2xs)", border: "1px solid var(--color-border)" }}>
                        {clase.estado}
                      </span>
                    </td>
                    <td style={{ padding: "var(--space-3)" }}>{clase.asignacion?.materia?.nombre ?? "—"}</td>
                    <td style={{ padding: "var(--space-3)" }}>{clase.comision?.nombre ?? "—"}</td>
                    <td style={{ padding: "var(--space-3)" }}>
                      {clase.suplente ? `${clase.suplente.apellido}, ${clase.suplente.nombre}` : "—"}
                    </td>
                    <td style={{ padding: "var(--space-3)" }}>
                      {clase.incidencia ? `#${clase.incidencia.id}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}