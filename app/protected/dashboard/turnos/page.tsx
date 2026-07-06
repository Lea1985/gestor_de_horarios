"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { minutosAHora, horaAMinutos } from "@/lib/helpers/tiempo"

type Turno = {
  id:                      number
  nombre:                  string
  horaInicio:              number
  horaFin:                 number
  activo:                  boolean
  deletedAt:               string | null
  tieneAsignacionesActivas: boolean
}

type FormData = {
  nombre:     string
  horaInicio: string
  horaFin:    string
}

const FORM_VACIO: FormData = { nombre: "", horaInicio: "", horaFin: "" }

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

function MenuGestionar({ turno, onEditar, onEliminar, onReactivar }: {
  turno:       Turno
  onEditar:    () => void
  onEliminar:  () => void
  onReactivar: () => void
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

  const esInactivo    = !turno.activo || turno.deletedAt !== null
  const puedeEliminar = !turno.tieneAsignacionesActivas

  return (
    <>
      <button ref={btnRef} onClick={abrir} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}>
        Gestionar ▾
      </button>
      {abierto && (
        <div ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 140, zIndex: 9999, overflow: "hidden" }}>
          {esInactivo ? (
            <button
              onClick={() => { setAbierto(false); onReactivar() }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              Reactivar
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </>
  )
}

export default function TurnosPage() {
  const { authHeaders } = useAuth()

  const [turnos,      setTurnos]      = useState<Turno[]>([])
  const [loading,     setLoading]     = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando,    setEditando]    = useState<number | null>(null)
  const [form,        setForm]        = useState<FormData>(FORM_VACIO)
  const [error,       setError]       = useState<string | null>(null)
  const [guardando,   setGuardando]   = useState(false)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  // ── Filtros ───────────────────────────────────────────────
  const [busqueda,     setBusqueda]     = useState("")
  const [verInactivos, setVerInactivos] = useState(false)

  const turnosFiltrados = useMemo(() => {
    let filtrados = turnos
    if (!verInactivos) filtrados = filtrados.filter(t => t.activo && t.deletedAt === null)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      filtrados = filtrados.filter(t => t.nombre.toLowerCase().includes(q))
    }
    return filtrados
  }, [turnos, busqueda, verInactivos])

  async function cargar() {
    try {
      setLoading(true)
      const res = await fetch(`/api/turnos?inactivos=${verInactivos}`, { headers: authHeaders })
      if (!res.ok) throw new Error()
      setTurnos(await res.json())
    } catch {
      setError("Error cargando turnos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization, verInactivos])

  function abrirCrear() {
    setEditando(null); setForm(FORM_VACIO); setMostrarForm(true); setError(null)
  }

  function abrirEditar(turno: Turno) {
    setEditando(turno.id)
    setForm({ nombre: turno.nombre, horaInicio: minutosAHora(turno.horaInicio), horaFin: minutosAHora(turno.horaFin) })
    setMostrarForm(true); setError(null)
  }

  function cancelar() {
    setMostrarForm(false); setEditando(null); setForm(FORM_VACIO); setError(null)
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    if (!form.horaInicio || !form.horaFin) { setError("Debe completar horario inicio y fin"); return }
    setGuardando(true); setError(null)
    try {
      const url    = editando ? `/api/turnos/${editando}` : "/api/turnos"
      const method = editando ? "PATCH" : "POST"
      const res = await fetch(url, {
        method, headers: authHeaders,
        body: JSON.stringify({ nombre: form.nombre, horaInicio: horaAMinutos(form.horaInicio), horaFin: horaAMinutos(form.horaFin) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando turno")
        return
      }
      await cargar(); cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/turnos/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando turno")
        return
      }
      await cargar()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  async function reactivar(id: number) {
    try {
      const res = await fetch(`/api/turnos/${id}/reactivar`, { method: "POST", headers: authHeaders })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error reactivando turno")
        return
      }
      await cargar()
    } catch {
      setError("Error de red")
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando turnos...
    </div>
  )

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar este turno? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Turnos</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {turnosFiltrados.length} turno{turnosFiltrados.length !== 1 ? "s" : ""}
              {!verInactivos && " activo" + (turnosFiltrados.length !== 1 ? "s" : "")}
            </p>
          </div>
          {!mostrarForm && (
            <button onClick={abrirCrear} style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}>
              + Nuevo turno
            </button>
          )}
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 480 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editando ? "Editar turno" : "Nuevo turno"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label style={s.label}>Nombre</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={s.input} placeholder="Ej: Mañana"
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
                />
              </div>
              <div>
                <label style={s.label}>Hora inicio</label>
                <input type="time" value={form.horaInicio} onChange={e => setForm({ ...form, horaInicio: e.target.value })} style={s.input}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
                />
              </div>
              <div>
                <label style={s.label}>Hora fin</label>
                <input type="time" value={form.horaFin} onChange={e => setForm({ ...form, horaFin: e.target.value })} style={s.input}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button onClick={cancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear turno"}
              </button>
            </div>
          </div>
        )}

        {/* Barra de búsqueda + toggle inactivos */}
        {!mostrarForm && (
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <input
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ ...s.input, flex: 1 }}
              onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
              onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" as const }}>
              <input type="checkbox" checked={verInactivos} onChange={e => setVerInactivos(e.target.checked)} style={{ cursor: "pointer" }} />
              Ver inactivos
            </label>
          </div>
        )}

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Nombre", "Inicio", "Fin", ""].map(col => <th key={col} style={s.th}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {turnosFiltrados.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                  No hay turnos{!verInactivos ? " activos" : ""} registrados
                </td></tr>
              ) : turnosFiltrados.map(turno => {
                const esInactivo = !turno.activo || turno.deletedAt !== null
                return (
                  <tr key={turno.id} style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={s.td}>
                      {turno.nombre}
                      {esInactivo && (
                        <span style={{ marginLeft: 6, fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td style={s.td}>{minutosAHora(turno.horaInicio)}</td>
                    <td style={s.td}>{minutosAHora(turno.horaFin)}</td>
                    <td style={s.td}>
                      <MenuGestionar
                        turno={turno}
                        onEditar={() => abrirEditar(turno)}
                        onEliminar={() => setConfirmarId(turno.id)}
                        onReactivar={() => reactivar(turno.id)}
                      />
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
