// app/protected/dashboard/incidencias/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type Incidencia = {
  id:           number
  asignacionId: number
  fecha_desde:  string
  fecha_hasta:  string
  observacion:  string | null
  asignacion?: {
    identificadorEstructural: string
    titularidades: {
      agente: { nombre: string; apellido: string }
    }[]
  }
  codigarioItem?: {
    codigo: string
    nombre: string
  }
  padre?: { id: number } | null
  hijos?: { id: number }[]
}

const s = {
  th: {
    textAlign:     "left"      as const,
    fontSize:      "var(--text-2xs)",
    fontWeight:    "var(--font-medium)" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color:         "var(--color-text-secondary)",
    padding:       "10px 12px",
    borderBottom:  "1px solid var(--color-border-strong)",
    background:    "var(--color-surface-raised)",
  },
  td: {
    padding:       "10px 12px",
    fontSize:      "var(--text-sm)",
    color:         "var(--color-text-primary)",
    borderBottom:  "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}

function ModalConfirmar({ mensaje, onConfirmar, onCancelar }: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }} onClick={onCancelar}>
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Confirmar acción</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>{mensaje}</p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function IncidenciasPage() {
  const { authHeaders }               = useAuth()
  const router                        = useRouter()
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  async function cargar() {
    try {
      setLoading(true)
      const res = await fetch("/api/incidencias", { headers: authHeaders })
      if (!res.ok) throw new Error()
      setIncidencias(await res.json())
    } catch {
      setError("Error cargando incidencias")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization])

  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/incidencias/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando")
        return
      }
      await cargar()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando incidencias...
    </div>
  )

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta incidencia? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Incidencias</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {incidencias.length} incidencia{incidencias.length !== 1 ? "s" : ""} registrada{incidencias.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/protected/dashboard/incidencias/nueva")}
            style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
          >
            + Nueva incidencia
          </button>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Agente", "Asignación", "Tipo", "Desde", "Hasta", "Cadena", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidencias.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                    No hay incidencias registradas
                  </td>
                </tr>
              ) : incidencias.map(i => (

                console.log(i),
                <tr
                  key={i.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={s.td}>
                    {(() => {
                      const agente = i.asignacion?.titularidades[0]?.agente
                      if (!i.asignacion) return `#${i.asignacionId}`
                      if (!agente) return <em>Vacante</em>
                      return `${agente.apellido}, ${agente.nombre}`
                    })()}
                  </td>
                  <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                    {i.asignacion?.identificadorEstructural ?? "—"}
                  </td>
                  <td style={s.td}>
                    {i.codigarioItem
                      ? <span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{i.codigarioItem.codigo}</span>
                          {" "}{i.codigarioItem.nombre}
                        </span>
                      : "—"
                    }
                  </td>
                  <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {i.fecha_desde?.slice(0, 10)}
                  </td>
                  <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {i.fecha_hasta?.slice(0, 10)}
                  </td>
                  <td style={s.td}>
                    {i.padre || (i.hijos?.length ?? 0) > 0
                      ? <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>Sí</span>
                      : <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>No</span>
                    }
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "var(--space-3)" }}>
                      <button
                        onClick={() =>
                          router.push(`/protected/dashboard/incidencias/${i.id}`)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-medium)",
                          color: "var(--color-accent)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Ver
                      </button>

                      <button
                        onClick={() =>
                          router.push(`/protected/dashboard/incidencias/editar/${i.id}`)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-medium)",
                          color: "var(--color-primary)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => setConfirmarId(i.id)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-medium)",
                          color: "var(--color-error)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}