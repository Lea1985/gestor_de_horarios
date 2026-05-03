// app/protected/dashboard/incidencias/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type CadenaItem = {
  id:          number
  fecha_desde: string
  fecha_hasta: string
  tipo?:       string
}

type Incidencia = {
  id:            number
  asignacionId:  number
  fecha_desde:   string
  fecha_hasta:   string
  observacion:   string | null
  asignacion?: {
    identificadorEstructural: string
    agente: { nombre: string; apellido: string; documento: string }
    unidad: { nombre: string; codigoUnidad: number }
  }
  codigarioItem?: { codigo: string; nombre: string }
  padre?: { id: number } | null
  hijos?: { id: number }[]
}

const s = {
  card: {
    background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
  },
  label: {
    fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const,
    color: "var(--color-text-secondary)", display: "block" as const, marginBottom: "var(--space-1)",
  },
  value: {
    fontSize: "var(--text-sm)", color: "var(--color-text-primary)",
    fontWeight: "var(--font-medium)" as const,
  },
  th: {
    textAlign: "left" as const, fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)" as const,
    textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "var(--color-text-secondary)",
    padding: "10px 12px", borderBottom: "1px solid var(--color-border-strong)",
    background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)", verticalAlign: "middle" as const,
  },
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={s.label}>{label}</span>
      <div style={s.value}>{children}</div>
    </div>
  )
}

function ModalConfirmar({ mensaje, onConfirmar, onCancelar }: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }} onClick={onCancelar}>
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Confirmar eliminación</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>{mensaje}</p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

function diasEntre(desde: string, hasta: string): number {
  const d1 = new Date(desde)
  const d2 = new Date(hasta)
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function LinkIncidencia({ id, actual, onClick }: { id: number; actual: boolean; onClick: () => void }) {
  if (actual) {
    return (
      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>
        #{id} <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", fontWeight: 400 }}>(esta)</span>
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}
    >
      #{id} →
    </button>
  )
}

export default function IncidenciaDetallePage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()
  const params          = useParams()
  const id              = params?.id as string

  const [incidencia, setIncidencia] = useState<Incidencia | null>(null)
  const [cadena,     setCadena]     = useState<CadenaItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [confirmar,  setConfirmar]  = useState(false)

  async function cargar() {
    try {
      setLoading(true)
      setError(null)
      const [r1, r2] = await Promise.all([
        fetch(`/api/incidencias/${id}`,        { headers: authHeaders }),
        fetch(`/api/incidencias/${id}/cadena`, { headers: authHeaders }),
      ])
      const data1 = await r1.json()
      const data2 = await r2.json()
      if (!r1.ok) { setError(data1.error ?? "No se pudo cargar la incidencia"); return }
      setIncidencia(data1)
      setCadena(Array.isArray(data2) ? data2 : [])
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization])

  async function eliminar() {
    try {
      const res = await fetch(`/api/incidencias/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "No se pudo eliminar")
        return
      }
      router.push("/protected/dashboard/incidencias")
    } catch {
      setError("Error de red")
    } finally {
      setConfirmar(false)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando incidencia...
    </div>
  )

  if (!incidencia) return (
    <div style={{ padding: "var(--space-8)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
      Incidencia no encontrada
    </div>
  )

  const dias = diasEntre(incidencia.fecha_desde, incidencia.fecha_hasta)

  return (
    <>
      {confirmar && (
        <ModalConfirmar
          mensaje="¿Eliminar esta incidencia? Esta acción no se puede deshacer."
          onConfirmar={eliminar}
          onCancelar={() => setConfirmar(false)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <button
              onClick={() => router.push("/protected/dashboard/incidencias")}
              style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
            >
              ← Volver a incidencias
            </button>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Incidencia #{incidencia.id}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {incidencia.codigarioItem
                ? `${incidencia.codigarioItem.codigo} — ${incidencia.codigarioItem.nombre}`
                : "Sin tipo"
              }
            </p>
          </div>

          {/* Acciones */}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              onClick={() => router.push(`/protected/dashboard/incidencias/editar/${id}`)}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              Editar
            </button>
            <button
              onClick={() => setConfirmar(true)}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              Eliminar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Agente y asignación */}
        <div style={{ ...s.card, padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
            Agente y asignación
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
            <Campo label="Agente">
              {incidencia.asignacion
                ? `${incidencia.asignacion.agente.apellido}, ${incidencia.asignacion.agente.nombre}`
                : `#${incidencia.asignacionId}`
              }
            </Campo>
            <Campo label="Documento">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                {incidencia.asignacion?.agente.documento ?? "—"}
              </span>
            </Campo>
            <Campo label="Unidad">
              {incidencia.asignacion
                ? `${incidencia.asignacion.unidad.nombre} (#${incidencia.asignacion.unidad.codigoUnidad})`
                : "—"
              }
            </Campo>
            <Campo label="Identificador estructural">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                {incidencia.asignacion?.identificadorEstructural ?? "—"}
              </span>
            </Campo>
          </div>
        </div>

        {/* Datos de la incidencia */}
        <div style={{ ...s.card, padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
            Datos de la incidencia
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>

            <Campo label="Tipo">
              {incidencia.codigarioItem
                ? `${incidencia.codigarioItem.codigo} — ${incidencia.codigarioItem.nombre}`
                : "—"
              }
            </Campo>

            <Campo label="Fecha desde">
              {incidencia.fecha_desde?.slice(0, 10)}
            </Campo>

            <Campo label="Fecha hasta">
              {incidencia.fecha_hasta?.slice(0, 10)}
            </Campo>

            <Campo label="Duración">
              {dias} día{dias !== 1 ? "s" : ""}
            </Campo>

            <Campo label="Incidencia padre">
              {incidencia.padre?.id
                ? <LinkIncidencia
                    id={incidencia.padre.id}
                    actual={false}
                    onClick={() => router.push(`/protected/dashboard/incidencias/${incidencia.padre!.id}`)}
                  />
                : <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Sin padre</span>
              }
            </Campo>

            <Campo label="Incidencias hijas">
              {!incidencia.hijos?.length
                ? <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Sin hijos</span>
                : (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "var(--space-2)" }}>
                    {incidencia.hijos.map(h => (
                      <LinkIncidencia
                        key={h.id}
                        id={h.id}
                        actual={false}
                        onClick={() => router.push(`/protected/dashboard/incidencias/${h.id}`)}
                      />
                    ))}
                  </div>
                )
              }
            </Campo>

            <div style={{ gridColumn: "1 / -1" }}>
              <Campo label="Observación">
                {incidencia.observacion
                  ? <span style={{ fontWeight: 400 }}>{incidencia.observacion}</span>
                  : <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Sin observaciones</span>
                }
              </Campo>
            </div>

          </div>
        </div>

        {/* Cadena */}
        <div style={{ ...s.card, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Cadena de incidencias
            </span>
            {cadena.length > 0 && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
                {cadena.length} incidencia{cadena.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ID", "Tipo", "Desde", "Hasta", "Días"].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cadena.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-8)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                    Sin cadena asociada
                  </td>
                </tr>
              ) : cadena.map(item => {
                const esActual   = item.id === Number(id)
                const diasItem   = diasEntre(item.fecha_desde, item.fecha_hasta)
                return (
                  <tr
                    key={item.id}
                    style={{
                      transition: "background 0.1s",
                      cursor: esActual ? "default" : "pointer",
                      background: esActual ? "var(--color-surface-raised)" : "transparent",
                    }}
                    onClick={() => !esActual && router.push(`/protected/dashboard/incidencias/${item.id}`)}
                    onMouseEnter={e => { if (!esActual) e.currentTarget.style.background = "var(--color-surface-raised)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = esActual ? "var(--color-surface-raised)" : "transparent" }}
                  >
                    <td style={s.td}>
                      <span style={{ fontWeight: esActual ? "var(--font-medium)" as const : undefined, color: esActual ? "var(--color-accent)" : undefined }}>
                        #{item.id}{esActual ? " ←" : ""}
                      </span>
                    </td>
                    <td style={s.td}>{item.tipo ?? "—"}</td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {item.fecha_desde?.slice(0, 10)}
                    </td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {item.fecha_hasta?.slice(0, 10)}
                    </td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {diasItem}d
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}
