"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Curso   = { id: number; nombre: string }
type Turno   = { id: number; nombre: string }
type Unidad  = { id: number; nombre: string; codigoUnidad: number }

type Comision = {
  id:                      number
  nombre:                  string
  descripcion?:            string | null
  cursoId:                 number
  turnoId:                 number
  unidadId?:               number | null
  activo:                  boolean
  curso?:                  Curso
  turno?:                  Turno
  unidad?:                 Unidad | null
  tieneAsignacionesActivas: boolean
}

type FormData = {
  nombre:      string
  descripcion: string
  cursoId:     string
  turnoId:     string
  unidadId:    string
}

const FORM_VACIO: FormData = { nombre: "", descripcion: "", cursoId: "", turnoId: "", unidadId: "" }

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
  inputDisabled: {
    width: "100%", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "var(--text-sm)",
    color: "var(--color-text-hint)", outline: "none", cursor: "not-allowed" as const, opacity: 0.6,
  },
  th: {
    textAlign: "left" as const, fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)" as const,
    textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "var(--color-text-secondary)",
    padding: "10px 12px", borderBottom: "1px solid var(--color-border-strong)", background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)", verticalAlign: "middle" as const,
  },
}

function focus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}
function blur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
}

function ModalConfirmar({ mensaje, onConfirmar, onCancelar }: { mensaje: string; onConfirmar: () => void; onCancelar: () => void }) {
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

function MenuGestionar({ comision, onEditar, onEliminar }: {
  comision:   Comision
  onEditar:   () => void
  onEliminar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [pos,     setPos]     = useState({ top: 0, left: 0 })
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setAbierto(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function abrir() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.right - 140 })
    setAbierto(v => !v)
  }

  const puedeEliminar = !comision.tieneAsignacionesActivas

  return (
    <>
      <button ref={btnRef} onClick={abrir} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}>
        Gestionar ▾
      </button>
      {abierto && (
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 140, zIndex: 9999, overflow: "hidden" }}>
          <button
            onClick={() => { setAbierto(false); onEditar() }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            Editar
          </button>
          <button
            onClick={() => { if (puedeEliminar) { setAbierto(false); onEliminar() } }}
            disabled={!puedeEliminar}
            title={!puedeEliminar ? "Tiene asignaciones activas" : undefined}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: puedeEliminar ? "var(--color-error)" : "var(--color-text-hint)", cursor: puedeEliminar ? "pointer" : "not-allowed", opacity: puedeEliminar ? 1 : 0.5 }}
            onMouseEnter={e => { if (puedeEliminar) e.currentTarget.style.background = "var(--color-surface-raised)" }}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            Eliminar
            {!puedeEliminar && (
              <span style={{ display: "block", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", fontWeight: 400, marginTop: 2 }}>
                Tiene asignaciones activas
              </span>
            )}
          </button>
        </div>
      )}
    </>
  )
}

export default function ComisionesPage() {
  const { authHeaders } = useAuth()

  const [loading,     setLoading]     = useState(true)
  const [guardando,   setGuardando]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [comisiones,  setComisiones]  = useState<Comision[]>([])
  const [cursos,      setCursos]      = useState<Curso[]>([])
  const [turnos,      setTurnos]      = useState<Turno[]>([])
  const [unidades,    setUnidades]    = useState<Unidad[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId,  setEditandoId]  = useState<number | null>(null)
  const [editandoTieneAsignaciones, setEditandoTieneAsignaciones] = useState(false)
  const [form,        setForm]        = useState<FormData>(FORM_VACIO)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  async function cargarTodo() {
    try {
      setLoading(true)
      setError(null)
      const [r1, r2, r3, r4] = await Promise.all([
        fetch("/api/comisiones", { headers: authHeaders }),
        fetch("/api/cursos",     { headers: authHeaders }),
        fetch("/api/turnos",     { headers: authHeaders }),
        fetch("/api/unidades",   { headers: authHeaders }),
      ])
      const [d1, d2, d3, d4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()])
      if (!r1.ok) throw new Error(d1.error)
      if (!r2.ok) throw new Error(d2.error)
      if (!r3.ok) throw new Error(d3.error)
      if (!r4.ok) throw new Error(d4.error)
      setComisiones(d1)
      setCursos(d2)
      setTurnos(d3)
      setUnidades(d4)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargarTodo()
  }, [authHeaders.Authorization])

  function abrirNuevo() {
    setEditandoId(null)
    setEditandoTieneAsignaciones(false)
    setForm(FORM_VACIO)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(item: Comision) {
    setEditandoId(item.id)
    setEditandoTieneAsignaciones(item.tieneAsignacionesActivas)
    setForm({
      nombre:      item.nombre,
      descripcion: item.descripcion ?? "",
      cursoId:     String(item.cursoId),
      turnoId:     String(item.turnoId),
      unidadId:    item.unidadId ? String(item.unidadId) : "",
    })
    setMostrarForm(true)
    setError(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setEditandoTieneAsignaciones(false)
    setForm(FORM_VACIO)
  }

  async function guardar() {
    try {
      setGuardando(true)
      setError(null)
      if (!form.nombre || !form.cursoId || !form.turnoId) {
        setError("Completá nombre, curso y turno")
        return
      }
      const body = {
        nombre:      form.nombre,
        descripcion: form.descripcion || null,
        cursoId:     Number(form.cursoId),
        turnoId:     Number(form.turnoId),
        unidadId:    form.unidadId ? Number(form.unidadId) : null,
      }
      const url    = editandoId === null ? "/api/comisiones" : `/api/comisiones/${editandoId}`
      const method = editandoId === null ? "POST" : "PATCH"
      const res  = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error guardando comisión"); return }
      cerrarForm()
      cargarTodo()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    try {
      const res  = await fetch(`/api/comisiones/${id}`, { method: "DELETE", headers: authHeaders })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error eliminando"); return }
      cargarTodo()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  // Campos estructurales bloqueados al editar con asignaciones activas
  const bloqueado = editandoId !== null && editandoTieneAsignaciones

  if (loading) return (
    <div style={{ padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando comisiones...
    </div>
  )

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta comisión? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Comisiones</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {comisiones.length} registro{comisiones.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!mostrarForm && (
            <button onClick={abrirNuevo} style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}>
              + Nueva comisión
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
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 700 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", marginBottom: bloqueado ? "var(--space-2)" : "var(--space-6)" }}>
              {editandoId === null ? "Nueva comisión" : "Editar comisión"}
            </h2>

            {bloqueado && (
              <div style={{ marginBottom: "var(--space-4)", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                Curso, turno y unidad están bloqueados porque esta comisión tiene asignaciones activas. Solo podés modificar el nombre y descripción.
              </div>
            )}

            <div style={{ display: "grid", gap: "var(--space-4)" }}>
              <div>
                <label style={s.label}>Nombre</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={s.input} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={s.label}>Descripción</label>
                <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} style={s.input} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={s.label}>Curso</label>
                <select
                  value={form.cursoId}
                  onChange={e => !bloqueado && setForm({ ...form, cursoId: e.target.value })}
                  style={bloqueado ? s.inputDisabled : s.input}
                  disabled={bloqueado}
                  onFocus={!bloqueado ? focus : undefined}
                  onBlur={!bloqueado ? blur : undefined}
                >
                  <option value="">Seleccionar</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Turno</label>
                <select
                  value={form.turnoId}
                  onChange={e => !bloqueado && setForm({ ...form, turnoId: e.target.value })}
                  style={bloqueado ? s.inputDisabled : s.input}
                  disabled={bloqueado}
                  onFocus={!bloqueado ? focus : undefined}
                  onBlur={!bloqueado ? blur : undefined}
                >
                  <option value="">Seleccionar</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Unidad</label>
                <select
                  value={form.unidadId}
                  onChange={e => !bloqueado && setForm({ ...form, unidadId: e.target.value })}
                  style={bloqueado ? s.inputDisabled : s.input}
                  disabled={bloqueado}
                  onFocus={!bloqueado ? focus : undefined}
                  onBlur={!bloqueado ? blur : undefined}
                >
                  <option value="">Sin unidad</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.codigoUnidad} - {u.nombre}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end", marginTop: "var(--space-6)" }}>
              <button onClick={cerrarForm} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.7 : 1 }}>
                {guardando ? "Guardando..." : editandoId === null ? "Crear" : "Actualizar"}
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nombre", "Curso", "Turno", "Unidad", ""].map(col => <th key={col} style={s.th}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {comisiones.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>Sin registros</td></tr>
              ) : comisiones.map(item => (
                <tr key={item.id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={s.td}>{item.nombre}</td>
                  <td style={s.td}>{item.curso?.nombre ?? "—"}</td>
                  <td style={s.td}>{item.turno?.nombre ?? "—"}</td>
                  <td style={s.td}>{item.unidad ? item.unidad.nombre : "—"}</td>
                  <td style={s.td}>
                    <MenuGestionar
                      comision={item}
                      onEditar={() => abrirEditar(item)}
                      onEliminar={() => setConfirmarId(item.id)}
                    />
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
