// app/protected/dashboard/cursos/[id]/materias/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type Materia = {
  id:                       number
  nombre:                   string
  cursoId:                  number | null
  activo:                   boolean
  deletedAt:                string | null
  tieneAsignacionesActivas: boolean
}

type Curso = {
  id:     number
  nombre: string
}

type FormData = { nombre: string }

const FORM_VACIO: FormData = { nombre: "" }

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
    padding: "10px 12px", borderBottom: "1px solid var(--color-border-strong)",
    background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)", verticalAlign: "middle" as const,
  },
}

function ModalConfirmar({ mensaje, onConfirmar, onCancelar }: {
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
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Confirmar acción</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>{mensaje}</p>
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

export default function MateriasPage() {
  const { authHeaders } = useAuth()
  const params = useParams()
  const cursoId = Number(params.id)

  const [curso,       setCurso]       = useState<Curso | null>(null)
  const [materias,    setMaterias]    = useState<Materia[]>([])
  const [loading,     setLoading]     = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId,  setEditandoId]  = useState<number | null>(null)
  const [form,        setForm]        = useState<FormData>(FORM_VACIO)
  const [formErrors,  setFormErrors]  = useState<Partial<FormData>>({})
  const [error,       setError]       = useState<string | null>(null)
  const [guardando,   setGuardando]   = useState(false)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  // ── Filtros ───────────────────────────────────────────────
  const [busqueda,     setBusqueda]     = useState("")
  const [verInactivos, setVerInactivos] = useState(false)

  const materiasFiltradas = useMemo(() => {
    let filtradas = materias
    if (!verInactivos) filtradas = filtradas.filter(m => m.activo && m.deletedAt === null)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      filtradas = filtradas.filter(m => m.nombre.toLowerCase().includes(q))
    }
    return filtradas
  }, [materias, busqueda, verInactivos])

  async function cargar() {
    try {
      setLoading(true)
      const [resCurso, resMaterias] = await Promise.all([
        fetch(`/api/cursos/${cursoId}`,          { headers: authHeaders }),
        fetch(`/api/cursos/${cursoId}/materias?inactivos=${verInactivos}`, { headers: authHeaders }),
      ])
      if (!resCurso.ok || !resMaterias.ok) throw new Error()
      setCurso(await resCurso.json())
      setMaterias(await resMaterias.json())
    } catch {
      setError("Error cargando datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization, verInactivos])

  function abrirCrear() {
    setForm(FORM_VACIO)
    setFormErrors({})
    setEditandoId(null)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(m: Materia) {
    setForm({ nombre: m.nombre })
    setFormErrors({})
    setEditandoId(m.id)
    setMostrarForm(true)
    setError(null)
  }

  function cancelar() {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
    setFormErrors({})
    setError(null)
  }

  function validar(): boolean {
    const errors: Partial<FormData> = {}
    if (!form.nombre.trim()) errors.nombre = "Campo requerido"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    setError(null)
    try {
      const url    = editandoId ? `/api/materias/${editandoId}` : `/api/cursos/${cursoId}/materias`
      const method = editandoId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method, headers: authHeaders,
        body: JSON.stringify({ nombre: form.nombre.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando")
        return
      }
      await cargar()
      cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/materias/${id}`, { method: "DELETE", headers: authHeaders })
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

  async function reactivar(id: number) {
    try {
      const res = await fetch(`/api/materias/${id}/reactivar`, { method: "POST", headers: authHeaders })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error reactivando materia")
        return
      }
      await cargar()
    } catch {
      setError("Error de red")
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando materias...
    </div>
  )

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta materia?"
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* BREADCRUMB */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          <Link href="/protected/dashboard/cursos" style={{ color: "var(--color-accent)", textDecoration: "none" }}>
            Cursos
          </Link>
          <span>›</span>
          <span style={{ color: "var(--color-text-primary)" }}>{curso?.nombre ?? "..."}</span>
          <span>›</span>
          <span>Materias</span>
        </div>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Materias — {curso?.nombre}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {materiasFiltradas.length} materia{materiasFiltradas.length !== 1 ? "s" : ""}
              {!verInactivos && " activa" + (materiasFiltradas.length !== 1 ? "s" : "")}
            </p>
          </div>
          {!mostrarForm && (
            <button
              onClick={abrirCrear}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nueva materia
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* FORMULARIO */}
        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 520 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editandoId ? "Editar materia" : "Nueva materia"}
            </h2>

            <div>
              <label style={s.label}>Nombre <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input
                value={form.nombre}
                onChange={e => { setForm({ nombre: e.target.value }); setFormErrors({}) }}
                style={{ ...s.input, ...(formErrors.nombre ? { borderColor: "var(--color-error)" } : {}) }}
                onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                onBlur={e => { e.target.style.borderColor = formErrors.nombre ? "var(--color-error)" : "var(--color-border)"; e.target.style.boxShadow = "none" }}
                onKeyDown={e => e.key === "Enter" && guardar()}
                placeholder="Ej: Matemática"
                autoFocus
              />
              {formErrors.nombre && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.nombre}</span>}
            </div>

            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button
                onClick={cancelar}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear materia"}
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

        {/* TABLA */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nombre", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materiasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                    No hay materias{!verInactivos ? " activas" : ""} para este curso
                  </td>
                </tr>
              ) : materiasFiltradas.map(m => {
                const esInactiva = !m.activo || m.deletedAt !== null
                return (
                  <tr
                    key={m.id}
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...s.td, fontWeight: "var(--font-medium)" }}>
                      {m.nombre}
                      {esInactiva && (
                        <span style={{ marginLeft: 6, fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td style={s.td}>
                      {esInactiva ? (
                        <button
                          onClick={() => reactivar(m.id)}
                          style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                        >
                          Reactivar
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                          <button
                            onClick={() => abrirEditar(m)}
                            style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                          >
                            Editar
                          </button>
                          {m.tieneAsignacionesActivas ? (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", display: "flex", alignItems: "center", gap: 4 }}>
                              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                                <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                              </svg>
                              Tiene asignaciones activas
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmarId(m.id)}
                              style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
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
