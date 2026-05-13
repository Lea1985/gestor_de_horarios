// app/protected/dashboard/modulosHorarios/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { minutosAHora, horaAMinutos } from "@/lib/helpers/tiempo"

type Modulo = {
  id:         number
  dia_semana: string
  hora_desde: number
  hora_hasta: number
  turnoId?:   number | null
  activo:     boolean
  createdAt?: string
  updatedAt?: string
}

type Turno = { id: number; nombre: string }

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]

const s = {
  label: { fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const, color: "var(--color-text-primary)", display: "block" as const, marginBottom: "var(--space-1)" },
  input: { width: "100%", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "var(--text-sm)", color: "var(--color-text-primary)", outline: "none" },
  infoLabel: { fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const, color: "var(--color-text-secondary)", display: "block" as const, marginBottom: "var(--space-1)" },
  infoValue: { fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" as const },
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }
function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }

function ModalConfirmar({ onConfirmar, onCancelar }: { onConfirmar: () => void; onCancelar: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }} onClick={onCancelar}>
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Confirmar eliminación</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>¿Eliminar este módulo horario? Las distribuciones que lo usen quedarán sin este módulo.</p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function ModuloHorarioDetallePage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()
  const params          = useParams()
  const id              = params?.id as string

  const [modulo,    setModulo]    = useState<Modulo | null>(null)
  const [turnos,    setTurnos]    = useState<Turno[]>([])
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [guardado,  setGuardado]  = useState(false)

  const [form,       setForm]       = useState({ dia_semana: "", hora_desde: "", hora_hasta: "", turnoId: "" })
  const [formErrors, setFormErrors] = useState<Partial<typeof form>>({})

  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    Promise.all([
      fetch(`/api/modulosHorarios/${id}`, { headers: authHeaders }),
      fetch(`/api/turnos`,                { headers: authHeaders }),
    ])
      .then(async ([r1, r2]) => {
        if (!r1.ok) throw new Error("Módulo no encontrado")
        const data = await r1.json()
        setModulo(data)
        setForm({ dia_semana: data.dia_semana, hora_desde: minutosAHora(data.hora_desde), hora_hasta: minutosAHora(data.hora_hasta), turnoId: data.turnoId ? String(data.turnoId) : "" })
        setTurnos(r2.ok ? await r2.json() : [])
      })
      .catch(e => setError(e.message ?? "Error de red"))
      .finally(() => setLoading(false))
  }, [authHeaders.Authorization])

  function validar(): boolean {
    const err: Partial<typeof form> = {}
    if (!form.dia_semana) err.dia_semana = "Requerido"
    if (!form.hora_desde) err.hora_desde = "Requerido"
    if (!form.hora_hasta) err.hora_hasta = "Requerido"
    setFormErrors(err); return Object.keys(err).length === 0
  }

  async function guardar() {
    if (!validar()) return
    const desde = horaAMinutos(form.hora_desde); const hasta = horaAMinutos(form.hora_hasta)
    if (desde >= hasta) { setError("La hora de inicio debe ser menor a la de fin"); return }
    setGuardando(true); setError(null); setGuardado(false)
    try {
      const res = await fetch(`/api/modulosHorarios/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ dia_semana: form.dia_semana, hora_desde: desde, hora_hasta: hasta, turnoId: form.turnoId ? Number(form.turnoId) : null }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error guardando"); return }
      setModulo(data); setGuardado(true)
    } catch { setError("Error de red") } finally { setGuardando(false) }
  }

  async function eliminar() {
    try {
      const res = await fetch(`/api/modulosHorarios/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) { setError("No se pudo eliminar"); return }
      router.push("/protected/dashboard/modulosHorarios")
    } catch { setError("Error de red") } finally { setConfirmar(false) }
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>Cargando módulo...</div>
  if (!modulo) return <div style={{ padding: "var(--space-8)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>{error ?? "Módulo no encontrado"}</div>

  const turnoNombre = turnos.find(t => t.id === modulo.turnoId)?.nombre

  return (
    <>
      {confirmar && <ModalConfirmar onConfirmar={eliminar} onCancelar={() => setConfirmar(false)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <button onClick={() => router.push("/protected/dashboard/modulosHorarios")} style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}>← Volver a módulos</button>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Módulo #{modulo.id}</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {modulo.dia_semana} · {minutosAHora(modulo.hora_desde)}–{minutosAHora(modulo.hora_hasta)}
              {turnoNombre && <span style={{ color: "var(--color-text-hint)" }}> · {turnoNombre}</span>}
            </p>
          </div>
          <button onClick={() => setConfirmar(true)} style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}>Eliminar</button>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>Editar módulo</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={s.label}>Día <span style={{ color: "var(--color-error)" }}>*</span></label>
              <select value={form.dia_semana} onChange={e => { setForm(p => ({ ...p, dia_semana: e.target.value })); setFormErrors(p => ({ ...p, dia_semana: undefined })) }} style={{ ...s.input, ...(formErrors.dia_semana ? { borderColor: "var(--color-error)" } : {}) }} onFocus={focusStyle} onBlur={blurStyle}>
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {formErrors.dia_semana && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.dia_semana}</span>}
            </div>
            <div>
              <label style={s.label}>Hora inicio <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input type="time" value={form.hora_desde} onChange={e => { setForm(p => ({ ...p, hora_desde: e.target.value })); setFormErrors(p => ({ ...p, hora_desde: undefined })) }} style={{ ...s.input, ...(formErrors.hora_desde ? { borderColor: "var(--color-error)" } : {}) }} onFocus={focusStyle} onBlur={blurStyle} />
              {formErrors.hora_desde && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.hora_desde}</span>}
            </div>
            <div>
              <label style={s.label}>Hora fin <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input type="time" value={form.hora_hasta} onChange={e => { setForm(p => ({ ...p, hora_hasta: e.target.value })); setFormErrors(p => ({ ...p, hora_hasta: undefined })) }} style={{ ...s.input, ...(formErrors.hora_hasta ? { borderColor: "var(--color-error)" } : {}) }} onFocus={focusStyle} onBlur={blurStyle} />
              {formErrors.hora_hasta && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.hora_hasta}</span>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={s.label}>Turno <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span></label>
              <select value={form.turnoId} onChange={e => setForm(p => ({ ...p, turnoId: e.target.value }))} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                <option value="">Sin turno</option>
                {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end", alignItems: "center" }}>
            {guardado && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success-text)", fontWeight: "var(--font-medium)" }}>✓ Guardado</span>}
            <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>Información</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
            <div>
              <span style={s.infoLabel}>Estado</span>
              <div style={s.infoValue}>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)", background: modulo.activo ? "var(--color-success-bg)" : "var(--color-error-bg)", color: modulo.activo ? "var(--color-success-text)" : "var(--color-error-text)" }}>
                  {modulo.activo ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>
            </div>
            <div><span style={s.infoLabel}>Creado</span><div style={s.infoValue}>{modulo.createdAt?.slice(0, 10) ?? "—"}</div></div>
            <div><span style={s.infoLabel}>Actualizado</span><div style={s.infoValue}>{modulo.updatedAt?.slice(0, 10) ?? "—"}</div></div>
          </div>
        </div>

      </div>
    </>
  )
}