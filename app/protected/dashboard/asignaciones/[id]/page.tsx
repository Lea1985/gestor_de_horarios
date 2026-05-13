// ─────────────────────────────────────────────────────────────────────────────
// app/protected/dashboard/asignaciones/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type TitularVigente = {
  id: number
  agente: {
    id: number
    nombre: string
    apellido: string
    documento: string
    email?: string
    telefono?: string
  }
}

type Asignacion = {
  id:                       number
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string | null
  estado:                   string
  titularidades:            TitularVigente[]
  unidad:   { id: number; nombre: string; codigoUnidad: number; tipo?: string }
  materia:  { id: number; nombre: string } | null
  comision: { id: number; nombre: string } | null
  turno:    { id: number; nombre: string } | null
  distribuciones?: { id: number; version: number; estado: string; fecha_vigencia_desde: string; fecha_vigencia_hasta: string | null }[]
  incidencias?:    { id: number; fecha_desde: string; fecha_hasta: string; codigarioItem?: { codigo: string; nombre: string } }[]
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

function Badge({ estado }: { estado: string }) {
  const activo = estado === "ACTIVO"
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
      background: activo ? "var(--color-success-bg)" : "var(--color-error-bg)",
      color:      activo ? "var(--color-success-text)" : "var(--color-error-text)",
    }}>
      {estado}
    </span>
  )
}

function ModalConfirmar({ onConfirmar, onCancelar }: { onConfirmar: () => void; onCancelar: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }} onClick={onCancelar}>
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Confirmar eliminación</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>¿Eliminar esta asignación? Se eliminará toda su información asociada.</p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function AsignacionDetallePage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()
  const params          = useParams()
  const id              = params?.id as string

  const [asignacion, setAsignacion] = useState<Asignacion | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [confirmar,  setConfirmar]  = useState(false)

  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    fetch(`/api/asignaciones/${id}`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setAsignacion(data) })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false))
  }, [authHeaders.Authorization])

  async function eliminar() {
    try {
      const res = await fetch(`/api/asignaciones/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error eliminando"); return }
      router.push("/protected/dashboard/asignaciones")
    } catch {
      setError("Error de red")
    } finally {
      setConfirmar(false)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando asignación...
    </div>
  )

  if (!asignacion) return (
    <div style={{ padding: "var(--space-8)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
      {error ?? "Asignación no encontrada"}
    </div>
  )

  const titular = asignacion.titularidades[0]?.agente ?? null

  const contexto = [
    asignacion.turno?.nombre,
    asignacion.comision?.nombre,
    asignacion.materia?.nombre,
  ].filter(Boolean)

  return (
    <>
      {confirmar && <ModalConfirmar onConfirmar={eliminar} onCancelar={() => setConfirmar(false)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <button
              onClick={() => router.push("/protected/dashboard/asignaciones")}
              style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
            >
              ← Volver a asignaciones
            </button>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
              {asignacion.identificadorEstructural}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {titular
                ? `${titular.apellido}, ${titular.nombre}`
                : <em>Vacante</em>}
              {contexto.length > 0 && (
                <span style={{ color: "var(--color-text-hint)" }}> · {contexto.join(" · ")}</span>
              )}
            </p>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <Badge estado={asignacion.estado} />
            <button
              onClick={() => router.push(`/protected/dashboard/asignaciones/${asignacion.id}/editar`)}
              style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              Editar
            </button>
            <button
              onClick={() => setConfirmar(true)}
              style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              Eliminar
            </button>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Titular vigente */}
        <div style={{ ...s.card, padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
            Titular vigente
          </h2>

          {titular ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
              <Campo label="Nombre">
                {titular.apellido}, {titular.nombre}
              </Campo>
              <Campo label="Documento">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                  {titular.documento}
                </span>
              </Campo>
              {titular.email && <Campo label="Email">{titular.email}</Campo>}
              {titular.telefono && <Campo label="Teléfono">{titular.telefono}</Campo>}
            </div>
          ) : (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-hint)", fontStyle: "italic" }}>
              Cargo vacante — sin titular asignado
            </p>
          )}
        </div>

        {/* Datos del cargo */}
        <div style={{ ...s.card, padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>Cargo</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
            <Campo label="Unidad">
              {asignacion.unidad.nombre}
              <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-text-hint)", fontWeight: 400 }}>#{asignacion.unidad.codigoUnidad}</span>
            </Campo>
            <Campo label="Fecha inicio">{asignacion.fecha_inicio.split("T")[0]}</Campo>
            <Campo label="Fecha fin">
              {asignacion.fecha_fin
                ? asignacion.fecha_fin.split("T")[0]
                : <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Indefinida</span>}
            </Campo>
            {asignacion.comision && <Campo label="Comisión">{asignacion.comision.nombre}</Campo>}
            {asignacion.turno    && <Campo label="Turno">{asignacion.turno.nombre}</Campo>}
            {asignacion.materia  && <Campo label="Materia">{asignacion.materia.nombre}</Campo>}
          </div>
        </div>

        {/* Distribuciones */}
        {(asignacion.distribuciones?.length ?? 0) > 0 && (
          <div style={{ ...s.card, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Distribuciones horarias</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>{asignacion.distribuciones!.length} versión{asignacion.distribuciones!.length !== 1 ? "es" : ""}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Versión", "Estado", "Vigencia desde", "Vigencia hasta", ""].map(col => <th key={col} style={s.th}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {asignacion.distribuciones!.map(d => (
                  <tr key={d.id} style={{ cursor: "pointer", transition: "background 0.1s" }}
                    onClick={() => router.push(`/protected/dashboard/distribuciones/${d.id}/modulos`)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={s.td}><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>v{d.version}</span></td>
                    <td style={s.td}><Badge estado={d.estado} /></td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{d.fecha_vigencia_desde.slice(0, 10)}</td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {d.fecha_vigencia_hasta?.slice(0, 10) ?? <span style={{ color: "var(--color-text-hint)" }}>Indefinida</span>}
                    </td>
                    <td style={s.td}><span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>Módulos →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Incidencias */}
        {(asignacion.incidencias?.length ?? 0) > 0 && (
          <div style={{ ...s.card, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Incidencias</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>{asignacion.incidencias!.length} registrada{asignacion.incidencias!.length !== 1 ? "s" : ""}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Tipo", "Desde", "Hasta"].map(col => <th key={col} style={s.th}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {asignacion.incidencias!.map(i => (
                  <tr key={i.id} style={{ cursor: "pointer", transition: "background 0.1s" }}
                    onClick={() => router.push(`/protected/dashboard/incidencias/${i.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={s.td}>
                      {i.codigarioItem
                        ? <><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{i.codigarioItem.codigo}</span> {i.codigarioItem.nombre}</>
                        : "—"}
                    </td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{i.fecha_desde.slice(0, 10)}</td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{i.fecha_hasta.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(asignacion.distribuciones?.length ?? 0) === 0 && (asignacion.incidencias?.length ?? 0) === 0 && (
          <div style={{ ...s.card, padding: "var(--space-8)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
            Sin distribuciones ni incidencias registradas
          </div>
        )}
      </div>
    </>
  )
}
