 //protected/dashboard/clases/page.tsx


"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Clase = {
  id: number
  fecha: string
  estado: "PROGRAMADA" | "REEMPLAZADA" | "SUSPENDIDA" | string

  asignacion?: {
    id: number
    materia?: {
      nombre: string
    } | null
  } | null

  comision?: {
    nombre: string
  } | null

  modulo?: {
    hora_desde: number
    hora_hasta: number
  } | null

  reemplazos?: {
    id: number
    agenteSuplente?: {
      apellido: string
      nombre: string
    } | null
  }[]

  incidencia?: {
    id: number
  } | null
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

      const res = await fetch("/api/clases?hoy=true", {
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

    const reemplazadas = clases.filter(
        c => c.reemplazos && c.reemplazos.length > 0
    ).length

    const suspendidas = clases.filter(
        c => c.estado === "SUSPENDIDA"
    ).length

    const sinCobertura = clases.filter(
        c =>
        c.incidencia &&
        (!c.reemplazos || c.reemplazos.length === 0) &&
        c.estado !== "SUSPENDIDA"
    ).length

    return {
        total,
        reemplazadas,
        suspendidas,
        sinCobertura,
    }
    }, [clases])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: "var(--font-medium)",
          }}
        >
          Operación diaria de clases
        </h1>

        <p
          style={{
            color: "var(--color-text-secondary)",
            marginTop: "var(--space-1)",
          }}
        >
          Vista operativa institucional del día
        </p>
      </div>

      {/* Métricas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {[
          {
            label: "Clases del día",
            value: metricas.total,
          },
          {
            label: "Reemplazos activos",
            value: metricas.reemplazadas,
          },
          {
            label: "Suspendidas",
            value: metricas.suspendidas,
          },
          {
            label: "Sin cobertura",
            value: metricas.sinCobertura,
          },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-4)",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-2xs)",
                textTransform: "uppercase",
                color: "var(--color-text-hint)",
                marginBottom: "var(--space-2)",
              }}
            >
              {card.label}
            </div>

            <div
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-medium)",
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--color-surface-raised)",
                  textAlign: "left",
                }}
              >
                {[
                  "Hora",
                  "Estado",
                  "Materia",
                  "Comisión",
                  "Suplente",
                  "Incidencia",
                ].map(header => (
                  <th
                    key={header}
                    style={{
                      padding: "var(--space-3)",
                      fontSize: "var(--text-xs)",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "var(--space-4)",
                    }}
                  >
                    Cargando clases...
                  </td>
                </tr>
              ) : clases.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "var(--space-4)",
                    }}
                  >
                    No hay clases para mostrar
                  </td>
                </tr>
              ) : (
                clases.map(clase => {
                  const suplente = clase.reemplazos?.[0]?.agenteSuplente

                  return (
                    <tr
                      key={clase.id}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <td style={{ padding: "var(--space-3)" }}>
                        {formatHora(clase.modulo?.hora_desde)} - {formatHora(clase.modulo?.hora_hasta)}
                      </td>

                      <td style={{ padding: "var(--space-3)" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "999px",
                            fontSize: "var(--text-2xs)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {clase.estado}
                        </span>
                      </td>

                      <td style={{ padding: "var(--space-3)" }}>
                        {clase.asignacion?.materia?.nombre ?? "—"}
                      </td>

                      <td style={{ padding: "var(--space-3)" }}>
                        {clase.comision?.nombre ?? "—"}
                      </td>

                      <td style={{ padding: "var(--space-3)" }}>
                        {suplente
                          ? `${suplente.apellido}, ${suplente.nombre}`
                          : "—"}
                      </td>

                      <td style={{ padding: "var(--space-3)" }}>
                        {clase.incidencia
                          ? `#${clase.incidencia.id}`
                          : "—"}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
