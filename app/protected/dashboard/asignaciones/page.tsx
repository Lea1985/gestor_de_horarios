// app/protected/dashboard/asignaciones/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

// ── Tipos ────────────────────────────────────────────────────

type TitularVigente = {
  id: number
  agente: {
    id:        number
    nombre:    string
    apellido:  string
    documento: string
  }
}

type Asignacion = {
  id:                       number
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string | null
  estado:                   string
  activo:                   boolean        // ← agregar
  deletedAt:                string | null
  titularidades:            TitularVigente[]
  unidad: {
    id:           number
    nombre:       string
    codigoUnidad: number
  }
  materia:  { id: number; nombre: string; cursoId: number | null } | null
  comision: {
    id:     number
    nombre: string
    curso:  { id: number; nombre: string }
    turno:  { id: number; nombre: string }
  } | null
  turno: { id: number; nombre: string } | null
}

function titularVigente(a: Asignacion) {
  return a.titularidades[0]?.agente ?? null
}

type Agente = {
  id: number
  nombre: string
  apellido: string
  documento: string
}

type Unidad   = { id: number; nombre: string; codigoUnidad: number }
type Materia  = { id: number; nombre: string; cursoId: number | null }
type Comision = {
  id:     number
  nombre: string
  curso:  { id: number; nombre: string }
  turno:  { id: number; nombre: string }
  unidad: { id: number; nombre: string; codigoUnidad: number } | null
}
type Turno = { id: number; nombre: string }

type FormData = {
  agenteId:                 string
  unidadId:                 string
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string
  materiaId:                string
  cursoId:                  string
  comisionId:               string
  turnoId:                  string
}

const FORM_VACIO: FormData = {
  agenteId: "", unidadId: "", identificadorEstructural: "",
  fecha_inicio: "", fecha_fin: "", materiaId: "",
  cursoId: "", comisionId: "", turnoId: "",
}

// ── Estilos ──────────────────────────────────────────────────

const s = {
  label: {
    fontSize:     "var(--text-xs)",
    fontWeight:   "var(--font-medium)" as const,
    color:        "var(--color-text-primary)",
    display:      "block" as const,
    marginBottom: "var(--space-1)",
  },
  input: {
    width:        "100%",
    background:   "var(--color-surface)",
    border:       "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding:      "8px 12px",
    fontSize:     "var(--text-sm)",
    color:        "var(--color-text-primary)",
    outline:      "none",
  },
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

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
}

// ── Modal confirmación ───────────────────────────────────────

function ModalConfirmar({
  mensaje, onConfirmar, onCancelar,
}: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
          Confirmar acción
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>
          {mensaje}
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────

export default function AsignacionesPage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()

  const [asignaciones,         setAsignaciones]         = useState<Asignacion[]>([])
  const [agentes,              setAgentes]              = useState<Agente[]>([])
  const [unidades,             setUnidades]             = useState<Unidad[]>([])
  const [materias,             setMaterias]             = useState<Materia[]>([])
  const [comisiones,           setComisiones]           = useState<Comision[]>([])
  const [turnos,               setTurnos]               = useState<Turno[]>([])
  const [loading,              setLoading]              = useState(true)
  const [loadingCombos,        setLoadingCombos]        = useState(false)
  const [mostrarForm,          setMostrarForm]          = useState(false)
  const [mostrarCambioTitular, setMostrarCambioTitular] = useState(false)
  const [editando,             setEditando]             = useState<number | null>(null)
  const [confirmarId,          setConfirmarId]          = useState<number | null>(null)
  const [form,                 setForm]                 = useState<FormData>(FORM_VACIO)
  const [error,                setError]                = useState<string | null>(null)
  const [guardando,            setGuardando]            = useState(false)
  const [busqueda,             setBusqueda]             = useState("")
  const [verInactivas,         setVerInactivas]         = useState(false)

  const comisionesDeUnidad = useMemo(() => {
    if (!form.unidadId) return []
    return comisiones.filter((c) => c.unidad?.id === Number(form.unidadId))
  }, [comisiones, form.unidadId])

  const unidadTieneComisiones = comisionesDeUnidad.length > 0

  const materiasFiltradas = useMemo(() => {
    if (!form.cursoId) return []
    return materias.filter((m) => m.cursoId === Number(form.cursoId))
  }, [materias, form.cursoId])

  const asignacionesFiltradas = useMemo(() => {
    const base = verInactivas
      ? asignaciones
      : asignaciones.filter((a) => a.deletedAt === null)      ? asignaciones
          : asignaciones.filter((a) => a.estado === "ACTIVO")
    if (!busqueda.trim()) return base
    const q = busqueda.toLowerCase()
    return base.filter((a) => {
      const titular = titularVigente(a)
      return (
        a.identificadorEstructural.toLowerCase().includes(q) ||
        titular?.apellido.toLowerCase().includes(q)          ||
        titular?.nombre.toLowerCase().includes(q)            ||
        titular?.documento.toLowerCase().includes(q)
      )
    })
  }, [asignaciones, busqueda, verInactivas])

async function cargarAsignaciones() {
  try {
    const url = `/api/asignaciones?inactivas=${String(verInactivas)}`
    console.log("fetch:", url)

    const res = await fetch(url, { headers: authHeaders })

    if (!res.ok) throw new Error()

    const data = await res.json()
    console.table(
  data.map((a: Asignacion) => ({
    id: a.id,
    estado: a.estado,
  }))
)

    setAsignaciones(data)
  } catch {
    setError("Error cargando asignaciones")
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  if (authHeaders.Authorization !== "Bearer ") {
    cargarAsignaciones()
  }
}, [authHeaders.Authorization, verInactivas])

  async function cargarCombos() {
    setLoadingCombos(true)
    try {
      const [rA, rU, rM, rCo, rT] = await Promise.all([
        fetch("/api/agentes",    { headers: authHeaders }),
        fetch("/api/unidades",   { headers: authHeaders }),
        fetch("/api/materias",   { headers: authHeaders }),
        fetch("/api/comisiones", { headers: authHeaders }),
        fetch("/api/turnos",     { headers: authHeaders }),
      ])
      setAgentes(rA.ok     ? await rA.json()  : [])
      setUnidades(rU.ok    ? await rU.json()  : [])
      setMaterias(rM.ok    ? await rM.json()  : [])
      setComisiones(rCo.ok ? await rCo.json() : [])
      setTurnos(rT.ok      ? await rT.json()  : [])
    } catch {
      setError("Error cargando opciones")
    } finally {
      setLoadingCombos(false)
    }
  }

  async function abrirCrear() {
    setForm(FORM_VACIO)
    setEditando(null)
    setMostrarForm(true)
    setMostrarCambioTitular(false)
    setError(null)
    await cargarCombos()
  }

  async function abrirEditar(a: Asignacion) {
    setEditando(a.id)
    setMostrarForm(true)
    setMostrarCambioTitular(false)
    setError(null)
    await cargarCombos()
    setForm({
      agenteId:                 "",
      unidadId:                 String(a.unidad.id),
      identificadorEstructural: a.identificadorEstructural,
      fecha_inicio:             a.fecha_inicio.split("T")[0],
      fecha_fin:                a.fecha_fin ? a.fecha_fin.split("T")[0] : "",
      materiaId:                a.materia  ? String(a.materia.id)  : "",
      cursoId:                  a.comision?.curso?.id ? String(a.comision.curso.id) : "",
      comisionId:               a.comision ? String(a.comision.id) : "",
      turnoId:                  a.turno    ? String(a.turno.id)    : "",
    })
  }

  async function abrirCambiarTitular(a: Asignacion) {
    const titular = titularVigente(a)
    setForm({ ...FORM_VACIO, agenteId: titular ? String(titular.id) : "" })
    setEditando(a.id)
    setMostrarCambioTitular(true)
    setMostrarForm(false)
    setError(null)
    await cargarCombos()
  }

  function cancelar() {
    setMostrarForm(false)
    setMostrarCambioTitular(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setError(null)
  }

  function campo<K extends keyof FormData>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onUnidadChange(unidadId: string) {
    setForm((prev) => ({ ...prev, unidadId, comisionId: "", cursoId: "", materiaId: "", turnoId: "" }))
  }

  function onComisionChange(comisionId: string) {
    setForm((prev) => {
      if (!comisionId) return { ...prev, comisionId: "", cursoId: "", materiaId: "", turnoId: "" }
      const comision = comisiones.find((c) => c.id === Number(comisionId))
      if (!comision) return prev
      const cursoId = String(comision.curso.id)
      const materiaSigueSiendoValida =
        prev.materiaId &&
        materias.some((m) => m.id === Number(prev.materiaId) && m.cursoId === Number(cursoId))
      return {
        ...prev,
        comisionId,
        cursoId,
        turnoId:   String(comision.turno.id),
        materiaId: materiaSigueSiendoValida ? prev.materiaId : "",
      }
    })
  }

  async function guardarAsignacion() {
    setGuardando(true)
    setError(null)
    try {
      const isNueva = !editando
      const body = isNueva
        ? {
            agenteId:                 form.agenteId ? Number(form.agenteId) : null,
            unidadId:                 Number(form.unidadId),
            identificadorEstructural: form.identificadorEstructural,
            fecha_inicio:             form.fecha_inicio,
            fecha_fin:                form.fecha_fin || null,
            materiaId:                form.materiaId  ? Number(form.materiaId)  : null,
            comisionId:               form.comisionId ? Number(form.comisionId) : null,
            turnoId:                  form.turnoId    ? Number(form.turnoId)    : null,
          }
        : {
            unidadId:                 Number(form.unidadId),
            identificadorEstructural: form.identificadorEstructural,
            fecha_inicio:             form.fecha_inicio,
            fecha_fin:                form.fecha_fin || null,
            materiaId:                form.materiaId  ? Number(form.materiaId)  : null,
            comisionId:               form.comisionId ? Number(form.comisionId) : null,
            turnoId:                  form.turnoId    ? Number(form.turnoId)    : null,
          }

      const res = await fetch(
        isNueva ? "/api/asignaciones" : `/api/asignaciones/${editando}`,
        { method: isNueva ? "POST" : "PATCH", headers: authHeaders, body: JSON.stringify(body) }
      )
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error guardando"); return }
      await cargarAsignaciones()
      cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function reactivar(id: number) {
    try {
      const res = await fetch(`/api/asignaciones/${id}/reactivar`, {
        method:  "POST",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error reactivando asignación")
        return
      }
      setAsignaciones(prev => prev.map(a =>
        a.id === id
          ? { ...a, activo: true, deletedAt: null, estado: "ACTIVO" }
          : a
      ))
    } catch {
      setError("Error de red")
    }
  }

  async function guardarCambioTitular() {
    if (!editando) return
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/asignaciones/${editando}/titular`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ agenteId: Number(form.agenteId) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error cambiando titular"); return }
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
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error eliminando"); return }
      await cargarAsignaciones()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando asignaciones...
    </div>
  )

  
  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta asignación? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Asignaciones
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {asignacionesFiltradas.length} asignación{asignacionesFiltradas.length !== 1 ? "es" : ""}
              {!verInactivas && (" activa" + (asignacionesFiltradas.length !== 1 ? "s" : ""))}
            </p>
          </div>
          {!mostrarForm && !mostrarCambioTitular && (
            <button
              onClick={abrirCrear}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nueva asignación
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }} aria-label="Cerrar">×</button>
          </div>
        )}

        {/* Formulario nueva / editar */}
        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 560 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editando ? "Editar asignación" : "Nueva asignación"}
            </h2>
            {loadingCombos ? (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>Cargando opciones...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {!editando && (
                  <div>
                    <label style={s.label}>Agente <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional — vacante si no se selecciona)</span></label>
                    <select value={form.agenteId} onChange={(e) => campo("agenteId", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                      <option value="">Seleccionar agente...</option>
                        {agentes.map((a) => (<option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label style={s.label}>Unidad <span style={{ color: "var(--color-error)" }}>*</span></label>
                  <select value={form.unidadId} onChange={(e) => onUnidadChange(e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                    <option value="">Seleccionar unidad...</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Identificador <span style={{ color: "var(--color-error)" }}>*</span></label>
                  <input value={form.identificadorEstructural} onChange={(e) => campo("identificadorEstructural", e.target.value)} placeholder="Ej: DOC-1A-LENGUA" style={s.input} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <div>
                    <label style={s.label}>Fecha inicio <span style={{ color: "var(--color-error)" }}>*</span></label>
                    <input type="date" value={form.fecha_inicio} onChange={(e) => campo("fecha_inicio", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
                  <div>
                    <label style={s.label}>Fecha fin <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span></label>
                    <input type="date" value={form.fecha_fin} onChange={(e) => campo("fecha_fin", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
                </div>
                {unidadTieneComisiones ? (
                  <>
                    <div>
                      <label style={s.label}>Comisión</label>
                      <select value={form.comisionId} onChange={(e) => onComisionChange(e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                        <option value="">Seleccionar comisión...</option>
                        {comisionesDeUnidad.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Materia</label>
                      <select value={form.materiaId} onChange={(e) => campo("materiaId", e.target.value)} style={{ ...s.input, opacity: !form.cursoId ? 0.5 : 1 }} onFocus={focusStyle} onBlur={blurStyle} disabled={!form.cursoId}>
                        <option value="">{!form.cursoId ? "Primero seleccioná una comisión" : "Seleccionar materia..."}</option>
                        {materiasFiltradas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={s.label}>Turno <span style={{ color: "var(--color-error)" }}>*</span></label>
                    <select value={form.turnoId} onChange={(e) => campo("turnoId", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                      <option value="">Seleccionar turno...</option>
                      {turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button onClick={cancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
                  <button onClick={guardarAsignacion} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                    {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear asignación"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal cambiar titular */}
        {mostrarCambioTitular && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 400 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>Cambiar titular</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label style={s.label}>Nuevo titular <span style={{ color: "var(--color-error)" }}>*</span></label>
                <select value={form.agenteId} onChange={(e) => campo("agenteId", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                  <option value="">Seleccionar agente...</option>
                    {agentes.map((a) => (<option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>))}  
                </select>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                <button onClick={cancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
                <button onClick={guardarCambioTitular} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Buscador + toggle */}
        {!mostrarForm && !mostrarCambioTitular && (
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <input
              placeholder="Buscar por titular, identificador o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ ...s.input, flex: 1 }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" as const }}>
              <input type="checkbox" checked={verInactivas} onChange={(e) => setVerInactivas(e.target.checked)} style={{ cursor: "pointer" }} />
              Ver inactivas
            </label>
          </div>
        )}

        {/* Tabla */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Titular vigente", "Unidad", "Identificador", "Contexto", "Inicio", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
<tbody>
  {asignacionesFiltradas.length === 0 ? (
    <tr>
      <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
        No hay asignaciones{!verInactivas ? " activas" : ""} registradas
      </td>
    </tr>
  ) : asignacionesFiltradas.map((a) => {
    const titular = titularVigente(a)
    return (
      <tr key={a.id} style={{ transition: "background 0.1s" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        <td style={s.td}>
          {titular ? `${titular.apellido}, ${titular.nombre}` : <em style={{ color: "var(--color-text-hint)" }}>Vacante</em>}
          {!a.activo && (
            <span style={{
              marginLeft: 6,
              fontSize: "var(--text-2xs)",
              padding: "2px 6px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-surface-raised)",
              color: "var(--color-text-hint)",
              border: "1px solid var(--color-border)",
            }}>
              Inactivo
            </span>
          )}
        </td>
        <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>{a.unidad.nombre}</td>
        <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{a.identificadorEstructural}</td>
        <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          {[a.turno?.nombre, a.comision?.nombre, a.materia?.nombre].filter(Boolean).join(" · ") || "—"}
        </td>
        <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{a.fecha_inicio.split("T")[0]}</td>
        <td style={s.td}>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            {a.activo ? (
              <>
                <button onClick={() => router.push(`/protected/dashboard/asignaciones/${a.id}`)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}>Ver</button>
                <button onClick={() => abrirEditar(a)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-primary)", cursor: "pointer", padding: 0 }}>Editar</button>
                <button onClick={() => abrirCambiarTitular(a)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-secondary)", cursor: "pointer", padding: 0 }}>Titular</button>
                <button onClick={() => setConfirmarId(a.id)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}>Eliminar</button>
              </>
            ) : (
              <button onClick={() => reactivar(a.id)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}>Reactivar</button>
            )}
          </div>
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