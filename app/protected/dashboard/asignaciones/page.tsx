// app/protected/dashboard/asignaciones/page.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

// ── Tipos ────────────────────────────────────────────────────

type Asignacion = {
  id:                       number
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string | null
  estado:                   string
  agente:   { id: number; nombre: string; apellido: string; documento: string }
  unidad:   { id: number; nombre: string; codigoUnidad: number }
  materia:  { id: number; nombre: string } | null
  curso:    { id: number; nombre: string } | null
  comision: { id: number; nombre: string } | null
  turno:    { id: number; nombre: string } | null
}

type Agente   = { agenteId: number; agente: { id: number; nombre: string; apellido: string; documento: string } }
type Unidad   = { id: number; nombre: string; codigoUnidad: number }
type Materia  = { id: number; nombre: string; cursoId: number | null }
type Curso    = { id: number; nombre: string }
type Comision = {
  id:      number
  nombre:  string
  curso:   { id: number; nombre: string }
  turno:   { id: number; nombre: string }
  unidad:  { id: number; nombre: string; codigoUnidad: number } | null
}
type Turno    = { id: number; nombre: string }

type FormData = {
  agenteId:                string
  unidadId:                string
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string
  materiaId:               string
  cursoId:                 string
  comisionId:              string
  turnoId:                 string
}

const FORM_VACIO: FormData = {
  agenteId: "", unidadId: "", identificadorEstructural: "",
  fecha_inicio: "", fecha_fin: "",
  materiaId: "", cursoId: "", comisionId: "", turnoId: "",
}

// ── Estilos ───────────────────────────────────────────────────

const s = {
  label: {
    fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const,
    color: "var(--color-text-primary)", display: "block" as const, marginBottom: "var(--space-1)",
  },
  input: {
    width: "100%", background: "var(--color-surface)",
    border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
    padding: "8px 12px", fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)", outline: "none",
  },
  th: {
    textAlign: "left" as const, fontSize: "var(--text-2xs)",
    fontWeight: "var(--font-medium)" as const, textTransform: "uppercase" as const,
    letterSpacing: "0.5px", color: "var(--color-text-secondary)",
    padding: "10px 12px", borderBottom: "1px solid var(--color-border-strong)",
    background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px", fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}

// ── Modal confirmación ────────────────────────────────────────

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

// ── Campo con label ───────────────────────────────────────────

function Campo({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label style={s.label}>
        {label}
        {required && <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>}
        {!required && <span style={{ color: "var(--color-text-hint)", marginLeft: 4, fontWeight: 400 }}>(opcional)</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{error}</span>}
    </div>
  )
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(hasError: boolean) {
  return (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = hasError ? "var(--color-error)" : "var(--color-border)"
    e.target.style.boxShadow   = "none"
  }
}

// ── Página ────────────────────────────────────────────────────

export default function AsignacionesPage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [agentes,      setAgentes]      = useState<Agente[]>([])
  const [unidades,     setUnidades]     = useState<Unidad[]>([])
  const [materias,     setMaterias]     = useState<Materia[]>([])
  const [cursos,       setCursos]       = useState<Curso[]>([])
  const [comisiones,   setComisiones]   = useState<Comision[]>([])
  const [turnos,       setTurnos]       = useState<Turno[]>([])

  const [loading,           setLoading]           = useState(true)
  const [loadingCombos,     setLoadingCombos]     = useState(false)
  const [mostrarForm,       setMostrarForm]        = useState(false)
  const [editando,          setEditando]           = useState<number | null>(null)
  const [expandirOpcionales, setExpandirOpcionales] = useState(false)
  const [form,              setForm]              = useState<FormData>(FORM_VACIO)
  const [formErrors,        setFormErrors]        = useState<Partial<FormData>>({})
  const [error,             setError]             = useState<string | null>(null)
  const [guardando,         setGuardando]         = useState(false)
  const [confirmarId,       setConfirmarId]       = useState<number | null>(null)
  const [busqueda,          setBusqueda]          = useState("")

  // ── Materias filtradas por el curso actualmente seleccionado ──

  const materiasFiltradas = useMemo(() => {
    if (!form.cursoId) return materias
    return materias.filter(m => m.cursoId === Number(form.cursoId))
  }, [materias, form.cursoId])

  // ── Cuando cambia la comisión → autocompletar curso, turno y unidad ──

  function onComisionChange(comisionId: string) {
    setForm(prev => {
      if (!comisionId) {
        // Limpiar los campos derivados si se deselecciona
        return { ...prev, comisionId: "", cursoId: "", turnoId: "", materiaId: "" }
      }
      const comision = comisiones.find(c => c.id === Number(comisionId))
      if (!comision) return { ...prev, comisionId }
      return {
        ...prev,
        comisionId: comisionId,
        cursoId:    String(comision.curso.id),
        turnoId:    String(comision.turno.id),
        // Si la comisión tiene unidad asignada, autocompletar también
        unidadId:   comision.unidad ? String(comision.unidad.id) : prev.unidadId,
        // Limpiar materia porque cambió el curso
        materiaId:  "",
      }
    })
    setFormErrors(p => ({ ...p, comisionId: undefined, cursoId: undefined, turnoId: undefined }))
  }

  // ── Carga de asignaciones ──────────────────────────────────

  async function cargarAsignaciones() {
    try {
      const res = await fetch("/api/asignaciones", { headers: authHeaders })
      if (!res.ok) throw new Error()
      setAsignaciones(await res.json())
    } catch {
      setError("Error cargando asignaciones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargarAsignaciones()
  }, [authHeaders.Authorization])

  // ── Carga de combos — solo cuando se abre el form ──────────

  async function cargarCombos() {
    setLoadingCombos(true)
    try {
      const [rA, rU, rM, rC, rCo, rT] = await Promise.all([
        fetch("/api/agentes",    { headers: authHeaders }),
        fetch("/api/unidades",   { headers: authHeaders }),
        fetch("/api/materias",   { headers: authHeaders }),
        fetch("/api/cursos",     { headers: authHeaders }),
        fetch("/api/comisiones", { headers: authHeaders }),
        fetch("/api/turnos",     { headers: authHeaders }),
      ])
      setAgentes(   rA.ok  ? await rA.json()  : [])
      setUnidades(  rU.ok  ? await rU.json()  : [])
      setMaterias(  rM.ok  ? await rM.json()  : [])
      setCursos(    rC.ok  ? await rC.json()  : [])
      setComisiones(rCo.ok ? await rCo.json() : [])
      setTurnos(    rT.ok  ? await rT.json()  : [])
    } catch {
      setError("Error cargando opciones del formulario")
    } finally {
      setLoadingCombos(false)
    }
  }

  // ── Form ───────────────────────────────────────────────────

  async function abrirCrear() {
    setForm(FORM_VACIO)
    setFormErrors({})
    setEditando(null)
    setExpandirOpcionales(false)
    setError(null)
    setMostrarForm(true)
    await cargarCombos()
  }

  async function abrirEditar(a: Asignacion) {
    setForm({
      agenteId:                String(a.agente.id),
      unidadId:                String(a.unidad.id),
      identificadorEstructural: a.identificadorEstructural,
      fecha_inicio:             a.fecha_inicio.split("T")[0],
      fecha_fin:                a.fecha_fin ? a.fecha_fin.split("T")[0] : "",
      materiaId:               a.materia   ? String(a.materia.id)   : "",
      cursoId:                 a.curso     ? String(a.curso.id)     : "",
      comisionId:              a.comision  ? String(a.comision.id)  : "",
      turnoId:                 a.turno     ? String(a.turno.id)     : "",
    })
    setFormErrors({})
    setEditando(a.id)
    setExpandirOpcionales(!!(a.materia || a.curso || a.comision || a.turno))
    setError(null)
    setMostrarForm(true)
    await cargarCombos()
  }

  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setFormErrors({})
    setError(null)
    setExpandirOpcionales(false)
  }

  function campo<K extends keyof FormData>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }))
    setFormErrors(p => ({ ...p, [key]: undefined }))
  }

  function validar(): boolean {
    const errors: Partial<FormData> = {}
    if (!editando && !form.agenteId) errors.agenteId = "Requerido"
    if (!editando && !form.unidadId) errors.unidadId = "Requerido"
    if (!form.identificadorEstructural.trim()) errors.identificadorEstructural = "Requerido"
    if (!form.fecha_inicio) errors.fecha_inicio = "Requerido"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    setError(null)

    try {
      const url    = editando ? `/api/asignaciones/${editando}` : "/api/asignaciones"
      const method = editando ? "PATCH" : "POST"

      const body = editando
        ? {
            identificadorEstructural: form.identificadorEstructural,
            fecha_inicio:             form.fecha_inicio,
            fecha_fin:                form.fecha_fin || null,
            materiaId:                form.materiaId  ? Number(form.materiaId)  : null,
            cursoId:                  form.cursoId    ? Number(form.cursoId)    : null,
            comisionId:               form.comisionId ? Number(form.comisionId) : null,
            turnoId:                  form.turnoId    ? Number(form.turnoId)    : null,
          }
        : {
            agenteId:                Number(form.agenteId),
            unidadId:                Number(form.unidadId),
            identificadorEstructural: form.identificadorEstructural,
            fecha_inicio:             form.fecha_inicio,
            fecha_fin:                form.fecha_fin || null,
            materiaId:                form.materiaId  ? Number(form.materiaId)  : null,
            cursoId:                  form.cursoId    ? Number(form.cursoId)    : null,
            comisionId:               form.comisionId ? Number(form.comisionId) : null,
            turnoId:                  form.turnoId    ? Number(form.turnoId)    : null,
          }

      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando asignación")
        return
      }

      await cargarAsignaciones()
      cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/asignaciones/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando")
        return
      }
      await cargarAsignaciones()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  // ── Filtro client-side ─────────────────────────────────────

  const asignacionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return asignaciones
    const q = busqueda.toLowerCase()
    return asignaciones.filter(a =>
      a.identificadorEstructural.toLowerCase().includes(q) ||
      a.agente.apellido.toLowerCase().includes(q) ||
      a.agente.nombre.toLowerCase().includes(q) ||
      a.agente.documento.toLowerCase().includes(q)
    )
  }, [asignaciones, busqueda])

  // ── Loading ────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando asignaciones...
    </div>
  )

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta asignación? Se eliminará toda su información asociada."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Asignaciones</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {asignaciones.length} asignación{asignaciones.length !== 1 ? "es" : ""} registrada{asignaciones.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!mostrarForm && (
            <button onClick={abrirCrear} style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}>
              + Nueva asignación
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Formulario */}
        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 600 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editando ? "Editar asignación" : "Nueva asignación"}
            </h2>

            {loadingCombos ? (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>Cargando opciones...</p>
            ) : (
              <>
                {/* Campos obligatorios */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

                  {!editando && (
                    <Campo label="Agente" required error={formErrors.agenteId}>
                      <select value={form.agenteId} onChange={e => campo("agenteId", e.target.value)}
                        style={{ ...s.input, ...(formErrors.agenteId ? { borderColor: "var(--color-error)" } : {}) }}
                        onFocus={focusStyle} onBlur={blurStyle(!!formErrors.agenteId)}>
                        <option value="">Seleccionar...</option>
                        {agentes.map(a => (
                          <option key={a.agente.id} value={a.agente.id}>
                            {a.agente.apellido}, {a.agente.nombre} — {a.agente.documento}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  )}

                  {!editando && (
                    <Campo label="Unidad" required error={formErrors.unidadId}>
                      <select value={form.unidadId} onChange={e => campo("unidadId", e.target.value)}
                        style={{ ...s.input, ...(formErrors.unidadId ? { borderColor: "var(--color-error)" } : {}) }}
                        onFocus={focusStyle} onBlur={blurStyle(!!formErrors.unidadId)}>
                        <option value="">Seleccionar...</option>
                        {unidades.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre} (#{u.codigoUnidad})</option>
                        ))}
                      </select>
                    </Campo>
                  )}

                  <Campo label="Identificador estructural" required error={formErrors.identificadorEstructural}>
                    <input value={form.identificadorEstructural}
                      onChange={e => campo("identificadorEstructural", e.target.value)}
                      style={{ ...s.input, ...(formErrors.identificadorEstructural ? { borderColor: "var(--color-error)" } : {}) }}
                      onFocus={focusStyle} onBlur={blurStyle(!!formErrors.identificadorEstructural)}
                      placeholder="Ej: DOC-1A-LENGUA" />
                  </Campo>

                  <Campo label="Fecha inicio" required error={formErrors.fecha_inicio}>
                    <input type="date" value={form.fecha_inicio}
                      onChange={e => campo("fecha_inicio", e.target.value)}
                      style={{ ...s.input, ...(formErrors.fecha_inicio ? { borderColor: "var(--color-error)" } : {}) }}
                      onFocus={focusStyle} onBlur={blurStyle(!!formErrors.fecha_inicio)} />
                  </Campo>

                  <Campo label="Fecha fin">
                    <input type="date" value={form.fecha_fin}
                      onChange={e => campo("fecha_fin", e.target.value)}
                      style={s.input} onFocus={focusStyle} onBlur={blurStyle(false)} />
                  </Campo>

                </div>

                {/* Campos opcionales — contexto escolar */}
                <div style={{ marginTop: "var(--space-4)" }}>
                  <button
                    type="button"
                    onClick={() => setExpandirOpcionales(p => !p)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", padding: 0, display: "flex", alignItems: "center", gap: "var(--space-1)" }}
                  >
                    {expandirOpcionales ? "▾" : "▸"} Contexto escolar (comisión, materia, curso, turno)
                  </button>

                  {expandirOpcionales && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--color-border)" }}>

                      {/* Comisión — va primero porque es el disparador */}
                      <Campo label="Comisión">
                        <select
                          value={form.comisionId}
                          onChange={e => onComisionChange(e.target.value)}
                          style={s.input}
                          onFocus={focusStyle}
                          onBlur={blurStyle(false)}
                        >
                          <option value="">Sin comisión</option>
                          {comisiones.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} ({c.curso.nombre} · {c.turno.nombre})
                            </option>
                          ))}
                        </select>
                      </Campo>

                      {/* Curso — se autocompleta al elegir comisión, pero se puede cambiar manualmente */}
                      <Campo label="Curso">
                        <select
                          value={form.cursoId}
                          onChange={e => {
                            campo("cursoId", e.target.value)
                            // Si cambia el curso manualmente, limpiar materia
                            setForm(p => ({ ...p, cursoId: e.target.value, materiaId: "" }))
                          }}
                          style={{
                            ...s.input,
                            // Indicar visualmente que fue autocompletado
                            background: form.comisionId && form.cursoId
                              ? "var(--color-surface-raised)"
                              : "var(--color-surface)",
                          }}
                          onFocus={focusStyle}
                          onBlur={blurStyle(false)}
                        >
                          <option value="">Sin curso</option>
                          {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </Campo>

                      {/* Turno — se autocompleta al elegir comisión */}
                      <Campo label="Turno">
                        <select
                          value={form.turnoId}
                          onChange={e => campo("turnoId", e.target.value)}
                          style={{
                            ...s.input,
                            background: form.comisionId && form.turnoId
                              ? "var(--color-surface-raised)"
                              : "var(--color-surface)",
                          }}
                          onFocus={focusStyle}
                          onBlur={blurStyle(false)}
                        >
                          <option value="">Sin turno</option>
                          {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                      </Campo>

                      {/* Materia — filtrada por el curso seleccionado */}
                      <Campo label="Materia">
                        <select
                          value={form.materiaId}
                          onChange={e => campo("materiaId", e.target.value)}
                          style={s.input}
                          onFocus={focusStyle}
                          onBlur={blurStyle(false)}
                          disabled={!form.cursoId}
                        >
                          <option value="">
                            {form.cursoId ? "Sin materia" : "Seleccioná un curso primero"}
                          </option>
                          {materiasFiltradas.map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      </Campo>

                    </div>
                  )}

                  {/* Ayuda contextual cuando hay comisión seleccionada */}
                  {expandirOpcionales && form.comisionId && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", marginTop: "var(--space-2)" }}>
                      Curso y turno autocompletados desde la comisión. Podés modificarlos manualmente.
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
                  <button onClick={cancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                    {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear asignación"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Búsqueda */}
        {!mostrarForm && (
          <input
            placeholder="Buscar por identificador, apellido o documento..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...s.input, maxWidth: 400 }}
            onFocus={focusStyle}
            onBlur={blurStyle(false)}
          />
        )}

        {/* Tabla */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Agente", "Unidad", "Identificador", "Contexto", "Inicio", "Estado", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {asignacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                    {busqueda ? "Sin resultados para esa búsqueda" : "No hay asignaciones registradas"}
                  </td>
                </tr>
              ) : asignacionesFiltradas.map(a => (
                <tr key={a.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={s.td}>
                    {a.agente.apellido}, {a.agente.nombre}
                    <span style={{ display: "block", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                      {a.agente.documento}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                    {a.unidad.nombre}
                    <span style={{ display: "block", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                      #{a.unidad.codigoUnidad}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                    {a.identificadorEstructural}
                  </td>
                  <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {[a.materia?.nombre, a.curso?.nombre, a.comision?.nombre, a.turno?.nombre]
                      .filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {a.fecha_inicio?.split("T")[0]}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-sm)",
                      fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
                      background: a.estado === "ACTIVO" ? "var(--color-success-bg)" : "var(--color-error-bg)",
                      color:      a.estado === "ACTIVO" ? "var(--color-success-text)" : "var(--color-error-text)",
                    }}>
                      {a.estado}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "var(--space-3)" }}>
                      <button
                        onClick={() => router.push(`/protected/dashboard/asignaciones/${a.id}`)}
                        style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-secondary)", cursor: "pointer", padding: 0 }}
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => abrirEditar(a)}
                        style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmarId(a.id)}
                        style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
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
