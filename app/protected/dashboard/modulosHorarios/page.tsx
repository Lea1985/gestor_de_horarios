// app/protected/dashboard/modulosHorarios/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { minutosAHora, horaAMinutos } from "@/lib/helpers/tiempo"

type Modulo = {
  id:         number
  dia_semana: string
  hora_desde: number
  hora_hasta: number
  turnoId?:   number | null
  activo:     boolean
}

type Turno = {
  id:         number
  nombre:     string
  horaInicio: number
  horaFin:    number
}

type FormData = {
  dia_semana: string
  hora_desde: string
  hora_hasta: string
  turnoId:    string
}

const FORM_VACIO: FormData = { dia_semana: "", hora_desde: "", hora_hasta: "", turnoId: "" }
const DIAS        = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]
const LABEL_DIAS: Record<string, string> = {
  LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié",
  JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom",
}

const s = {
  label: {
    fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const,
    color: "var(--color-text-primary)", display: "block" as const, marginBottom: "var(--space-1)",
  },
  input: {
    width: "100%", background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)", outline: "none",
  },
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}
function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
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

function GrillaSemanal({ modulos, turnos, diasActivos, onEditar, onEliminar }: {
  modulos: Modulo[]; turnos: Turno[]; diasActivos: string[]
  onEditar: (m: Modulo) => void; onEliminar: (id: number) => void
}) {
  const { minInicio, maxFin } = useMemo(() => {
    if (modulos.length === 0) return { minInicio: 7 * 60, maxFin: 22 * 60 }
    const ini = Math.min(...modulos.map(m => m.hora_desde))
    const fin = Math.max(...modulos.map(m => m.hora_hasta))
    return { minInicio: Math.floor(ini / 60) * 60, maxFin: Math.ceil(fin / 60) * 60 }
  }, [modulos])

  const horas: number[] = []
  for (let h = minInicio; h <= maxFin; h += 60) horas.push(h)

  const totalMinutos = maxFin - minInicio
  const PX_POR_MIN   = 1.8

  const turnoColor: Record<number, string> = {}
  const PALETA = ["var(--color-accent)", "#7c6fcd", "#2ebc8a", "#e8a838", "#d95c5c", "#5c9bd9", "#d95cb5", "#6eb86e"]
  turnos.forEach((t, i) => { turnoColor[t.id] = PALETA[i % PALETA.length] })

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", minWidth: diasActivos.length * 120 + 56 }}>
        <div style={{ width: 48, flexShrink: 0, position: "relative", marginTop: 36 }}>
          {horas.map(h => (
            <div key={h} style={{ position: "absolute", top: ((h - minInicio) * PX_POR_MIN), left: 0, width: "100%", display: "flex", alignItems: "center", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", paddingRight: 4, justifyContent: "flex-end", height: 1 }}>
              {minutosAHora(h)}
            </div>
          ))}
          <div style={{ height: totalMinutos * PX_POR_MIN }} />
        </div>

        {diasActivos.map(dia => {
          const modulosDia = modulos.filter(m => m.dia_semana === dia).sort((a, b) => a.hora_desde - b.hora_desde)
          return (
            <div key={dia} style={{ flex: 1, minWidth: 110 }}>
              <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
                {LABEL_DIAS[dia]}
                <span style={{ marginLeft: 4, color: "var(--color-text-hint)", fontWeight: 400 }}>({modulosDia.length})</span>
              </div>
              <div style={{ position: "relative", height: totalMinutos * PX_POR_MIN, borderRight: "1px solid var(--color-border)" }}>
                {horas.map(h => (
                  <div key={h} style={{ position: "absolute", top: (h - minInicio) * PX_POR_MIN, left: 0, right: 0, borderTop: "1px solid var(--color-border)", opacity: 0.5 }} />
                ))}
                {modulosDia.map(m => {
                  const top    = (m.hora_desde - minInicio) * PX_POR_MIN
                  const height = (m.hora_hasta - m.hora_desde) * PX_POR_MIN
                  const turno  = turnos.find(t => t.id === m.turnoId)
                  const color  = m.turnoId ? turnoColor[m.turnoId] : "var(--color-accent)"
                  return (
                    <div key={m.id} style={{ position: "absolute", top, left: 3, right: 3, height: height - 2, borderRadius: "var(--radius-md)", background: `${color}18`, border: `1px solid ${color}55`, padding: "3px 6px", display: "flex", flexDirection: "column" as const, justifyContent: "space-between", overflow: "hidden", cursor: "pointer", transition: "filter 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.93)")}
                      onMouseLeave={e => (e.currentTarget.style.filter = "none")}>
                      <div style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)", color, lineHeight: 1.2 }}>
                        {minutosAHora(m.hora_desde)}–{minutosAHora(m.hora_hasta)}
                      </div>
                      {turno && height > 28 && (
                        <div style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", lineHeight: 1 }}>{turno.nombre}</div>
                      )}
                      {height > 40 && (
                        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                          <button onClick={e => { e.stopPropagation(); onEditar(m) }} style={{ background: "none", border: "none", fontSize: "var(--text-2xs)", color, cursor: "pointer", padding: 0, fontWeight: "var(--font-medium)" }}>Editar</button>
                          <button onClick={e => { e.stopPropagation(); onEliminar(m.id) }} style={{ background: "none", border: "none", fontSize: "var(--text-2xs)", color: "var(--color-error)", cursor: "pointer", padding: 0, fontWeight: "var(--font-medium)" }}>×</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {turnos.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" as const, marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border)" }}>
          {turnos.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: turnoColor[t.id] }} />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{t.nombre}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-accent)" }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>Sin turno</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ModulosHorariosPage() {
  const { authHeaders } = useAuth()

  const [modulos,   setModulos]   = useState<Modulo[]>([])
  const [turnos,    setTurnos]    = useState<Turno[]>([])
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [modoMasivo,  setModoMasivo]  = useState(false)
  const [editandoId,  setEditandoId]  = useState<number | null>(null)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  const [form,       setForm]       = useState<FormData>(FORM_VACIO)
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({})

  const diasActivos = useMemo(() => DIAS.filter(d => modulos.some(m => m.dia_semana === d)), [modulos])

  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([])
  const [formMasivo, setFormMasivo] = useState({ hora_inicio: "", duracion_modulo: "40", cantidad_modulos: "8", turnoId: "" })
  const [recreos,    setRecreos]    = useState([{ despuesDe: "2", duracion: "10" }])

  async function cargar() {
    try {
      setLoading(true); setError(null)
      const [r1, r2] = await Promise.all([
        fetch("/api/modulosHorarios", { headers: authHeaders }),
        fetch("/api/turnos",          { headers: authHeaders }),
      ])
      if (!r1.ok || !r2.ok) throw new Error()
      setModulos(await r1.json()); setTurnos(await r2.json())
    } catch { setError("Error cargando datos") } finally { setLoading(false) }
  }

  useEffect(() => { if (authHeaders.Authorization !== "Bearer ") cargar() }, [authHeaders.Authorization])

  function abrirNuevo() { setEditandoId(null); setForm(FORM_VACIO); setFormErrors({}); setMostrarForm(true); setModoMasivo(false); setError(null) }

  function abrirEditar(m: Modulo) {
    setEditandoId(m.id)
    setForm({ dia_semana: m.dia_semana, hora_desde: minutosAHora(m.hora_desde), hora_hasta: minutosAHora(m.hora_hasta), turnoId: m.turnoId ? String(m.turnoId) : "" })
    setFormErrors({}); setMostrarForm(true); setModoMasivo(false); setError(null)
  }

  function cerrarForm() { setMostrarForm(false); setModoMasivo(false); setEditandoId(null); setForm(FORM_VACIO); setFormErrors({}) }

  function validarForm(): boolean {
    const err: Partial<FormData> = {}
    if (!form.dia_semana) err.dia_semana = "Requerido"
    if (!form.hora_desde) err.hora_desde = "Requerido"
    if (!form.hora_hasta) err.hora_hasta = "Requerido"
    setFormErrors(err); return Object.keys(err).length === 0
  }

  async function guardar() {
    if (!validarForm()) return
    const desde = horaAMinutos(form.hora_desde); const hasta = horaAMinutos(form.hora_hasta)
    if (desde >= hasta) { setError("La hora de inicio debe ser menor a la hora de fin"); return }
    setGuardando(true); setError(null)
    try {
      const url = editandoId ? `/api/modulosHorarios/${editandoId}` : "/api/modulosHorarios"
      const method = editandoId ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify({ dia_semana: form.dia_semana, hora_desde: desde, hora_hasta: hasta, turnoId: form.turnoId ? Number(form.turnoId) : null }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error guardando"); return }
      cerrarForm(); await cargar()
    } catch { setError("Error de red") } finally { setGuardando(false) }
  }

  async function guardarMasivo() {
    if (!formMasivo.hora_inicio) { setError("Definí hora de inicio"); return }
    if (diasSeleccionados.length === 0) { setError("Seleccioná al menos un día"); return }
    setGuardando(true); setError(null)
    const inicio = horaAMinutos(formMasivo.hora_inicio); const duracion = Number(formMasivo.duracion_modulo); const cantidad = Number(formMasivo.cantidad_modulos)
    const pausas = recreos.filter(r => r.despuesDe && r.duracion).map(r => ({ despuesDe: Number(r.despuesDe), duracion: Number(r.duracion) }))
    const requests: Promise<Response>[] = []
    for (const dia of diasSeleccionados) {
      let cursor = inicio
      for (let i = 1; i <= cantidad; i++) {
        requests.push(fetch("/api/modulosHorarios", { method: "POST", headers: authHeaders, body: JSON.stringify({ dia_semana: dia, hora_desde: cursor, hora_hasta: cursor + duracion, turnoId: formMasivo.turnoId ? Number(formMasivo.turnoId) : null }) }))
        cursor += duracion
        const pausa = pausas.find(p => p.despuesDe === i); if (pausa) cursor += pausa.duracion
      }
    }
    const responses = await Promise.all(requests)
    if (responses.some(r => !r.ok)) setError("Algunos módulos no pudieron crearse (puede haber duplicados)")
    setModoMasivo(false); setDiasSeleccionados([]); setRecreos([{ despuesDe: "2", duracion: "10" }])
    await cargar(); setGuardando(false)
  }

  async function eliminar(id: number) {
    try { await fetch(`/api/modulosHorarios/${id}`, { method: "DELETE", headers: authHeaders }); await cargar() }
    catch { setError("Error eliminando") } finally { setConfirmarId(null) }
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>Cargando módulos...</div>

  return (
    <>
      {confirmarId !== null && <ModalConfirmar mensaje="¿Eliminar este módulo horario?" onConfirmar={() => eliminar(confirmarId)} onCancelar={() => setConfirmarId(null)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Módulos horarios</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>{modulos.length} módulo{modulos.length !== 1 ? "s" : ""} · {diasActivos.length} día{diasActivos.length !== 1 ? "s" : ""} con módulos</p>
          </div>
          {!mostrarForm && !modoMasivo && (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button onClick={() => { setModoMasivo(true); setMostrarForm(false); setError(null) }} style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Generación masiva</button>
              <button onClick={abrirNuevo} style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}>+ Nuevo módulo</button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 480 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>{editandoId ? "Editar módulo" : "Nuevo módulo"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Día <span style={{ color: "var(--color-error)" }}>*</span></label>
                <select value={form.dia_semana} onChange={e => { setForm(p => ({ ...p, dia_semana: e.target.value })); setFormErrors(p => ({ ...p, dia_semana: undefined })) }} style={{ ...s.input, ...(formErrors.dia_semana ? { borderColor: "var(--color-error)" } : {}) }} onFocus={focusStyle} onBlur={blurStyle}>
                  <option value="">Seleccionar día...</option>
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
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button onClick={cerrarForm} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear módulo"}
              </button>
            </div>
          </div>
        )}

        {modoMasivo && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 560 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Generación masiva</h2>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>Genera automáticamente todos los módulos de un turno a partir de hora de inicio, duración y recreos.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div>
                <label style={s.label}>Hora de inicio <span style={{ color: "var(--color-error)" }}>*</span></label>
                <input type="time" value={formMasivo.hora_inicio} onChange={e => setFormMasivo(p => ({ ...p, hora_inicio: e.target.value }))} style={s.input} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={s.label}>Duración módulo <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(min)</span></label>
                <input type="number" min={1} value={formMasivo.duracion_modulo} onChange={e => setFormMasivo(p => ({ ...p, duracion_modulo: e.target.value }))} style={s.input} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={s.label}>Cantidad de módulos</label>
                <input type="number" min={1} max={20} value={formMasivo.cantidad_modulos} onChange={e => setFormMasivo(p => ({ ...p, cantidad_modulos: e.target.value }))} style={s.input} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={s.label}>Turno <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span></label>
                <select value={formMasivo.turnoId} onChange={e => setFormMasivo(p => ({ ...p, turnoId: e.target.value }))} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                  <option value="">Sin turno</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...s.label, marginBottom: "var(--space-2)" }}>Días <span style={{ color: "var(--color-error)" }}>*</span></label>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" as const }}>
                  {DIAS.map(dia => {
                    const sel = diasSeleccionados.includes(dia)
                    return (
                      <button key={dia} type="button" onClick={() => setDiasSeleccionados(prev => sel ? prev.filter(d => d !== dia) : [...prev, dia])}
                        style={{ padding: "6px 12px", borderRadius: "var(--radius-lg)", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", cursor: "pointer", border: "none", background: sel ? "var(--color-primary)" : "var(--color-surface-raised)", color: sel ? "white" : "var(--color-text-secondary)" }}>
                        {LABEL_DIAS[dia]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                  <label style={s.label}>Recreos - Despues del modulo N° - duracion del mismo</label>
                  <button type="button" onClick={() => setRecreos(p => [...p, { despuesDe: "", duracion: "" }])} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", color: "var(--color-accent)", cursor: "pointer", fontWeight: "var(--font-medium)" }}>+ Agregar recreo</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "var(--space-2)" }}>
                  {recreos.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <div style={{ flex: 1 }}><input type="number" min={1} placeholder="Después del módulo N°" value={r.despuesDe} onChange={e => setRecreos(p => p.map((x, j) => j === i ? { ...x, despuesDe: e.target.value } : x))} style={s.input} onFocus={focusStyle} onBlur={blurStyle} /></div>
                      <div style={{ flex: 1 }}><input type="number" min={1} placeholder="Duración (min)" value={r.duracion} onChange={e => setRecreos(p => p.map((x, j) => j === i ? { ...x, duracion: e.target.value } : x))} style={s.input} onFocus={focusStyle} onBlur={blurStyle} /></div>
                      <button type="button" onClick={() => setRecreos(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", fontSize: "var(--text-base)", color: "var(--color-error)", cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button onClick={cerrarForm} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarMasivo} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                {guardando ? "Generando..." : "Generar módulos"}
              </button>
            </div>
          </div>
        )}

        {modulos.length === 0 ? (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-12)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
            No hay módulos horarios. Creá uno o usá la generación masiva.
          </div>
        ) : (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)" }}>
            <GrillaSemanal modulos={modulos} turnos={turnos} diasActivos={diasActivos} onEditar={abrirEditar} onEliminar={id => setConfirmarId(id)} />
          </div>
        )}

      </div>
    </>
  )
}