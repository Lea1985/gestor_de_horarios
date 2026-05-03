// app/protected/dashboard/codigarios/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/app/hooks/useAuth"

type Codigario = {
  id:          number
  nombre:      string
  descripcion: string | null
  activo:      boolean
}

type FormData = {
  nombre:      string
  descripcion: string
}

const FORM_VACIO: FormData = { nombre: "", descripcion: "" }

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

export default function CodigariosPage() {
  const { authHeaders } = useAuth()

  const [codigarios,  setCodigarios]  = useState<Codigario[]>([])
  const [loading,     setLoading]     = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId,  setEditandoId]  = useState<number | null>(null)
  const [form,        setForm]        = useState<FormData>(FORM_VACIO)
  const [formErrors,  setFormErrors]  = useState<Partial<FormData>>({})
  const [error,       setError]       = useState<string | null>(null)
  const [guardando,   setGuardando]   = useState(false)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  async function cargar() {
    try {
      setLoading(true)
      const res = await fetch("/api/codigarios", { headers: authHeaders })
      if (!res.ok) throw new Error()
      setCodigarios(await res.json())
    } catch {
      setError("Error cargando codigarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization])

  function abrirCrear() {
    setForm(FORM_VACIO)
    setFormErrors({})
    setEditandoId(null)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(c: Codigario) {
    setForm({ nombre: c.nombre, descripcion: c.descripcion ?? "" })
    setFormErrors({})
    setEditandoId(c.id)
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
      const url    = editandoId ? `/api/codigarios/${editandoId}` : "/api/codigarios"
      const method = editandoId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method, headers: authHeaders,
        body: JSON.stringify({ nombre: form.nombre, descripcion: form.descripcion || null }),
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
      const res = await fetch(`/api/codigarios/${id}`, { method: "DELETE", headers: authHeaders })
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
      Cargando codigarios...
    </div>
  )

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar este codigario? Se eliminarán también todos sus items."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Codigarios</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {codigarios.length} catálogo{codigarios.length !== 1 ? "s" : ""} institucional{codigarios.length !== 1 ? "es" : ""}
            </p>
          </div>
          {!mostrarForm && (
            <button onClick={abrirCrear} style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}>
              + Nuevo codigario
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
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 520 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editandoId ? "Editar codigario" : "Nuevo codigario"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label style={s.label}>Nombre <span style={{ color: "var(--color-error)" }}>*</span></label>
                <input
                  value={form.nombre}
                  onChange={e => { setForm(p => ({ ...p, nombre: e.target.value })); setFormErrors(p => ({ ...p, nombre: undefined })) }}
                  style={{ ...s.input, ...(formErrors.nombre ? { borderColor: "var(--color-error)" } : {}) }}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e => { e.target.style.borderColor = formErrors.nombre ? "var(--color-error)" : "var(--color-border)"; e.target.style.boxShadow = "none" }}
                  placeholder="Ej: AUSENTISMO DOCENTE"
                />
                {formErrors.nombre && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.nombre}</span>}
              </div>

              <div>
                <label style={s.label}>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  style={{ ...s.input, resize: "vertical", minHeight: 80 }}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
                  placeholder="Descripción opcional"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button onClick={cancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear codigario"}
              </button>
            </div>
          </div>
        )}

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nombre", "Descripción", "Items", ""].map(col => <th key={col} style={s.th}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {codigarios.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>No hay codigarios registrados</td></tr>
              ) : codigarios.map(c => (
                <tr key={c.id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...s.td, fontWeight: "var(--font-medium)" }}>{c.nombre}</td>
                  <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>{c.descripcion ?? "—"}</td>
                  <td style={s.td}>
                    <Link href={`/protected/dashboard/codigarios/${c.id}`} style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", textDecoration: "none" }}>
                      Administrar →
                    </Link>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "var(--space-3)" }}>
                      <button onClick={() => abrirEditar(c)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}>Editar</button>
                      <button onClick={() => setConfirmarId(c.id)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}>Eliminar</button>
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