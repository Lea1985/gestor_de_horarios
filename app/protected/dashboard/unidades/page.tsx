"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

// ── Tipos ────────────────────────────────────────────────────
type Unidad = {
  id:           number
  codigoUnidad: number
  nombre:       string
  tipo:         string | null
  activo:       boolean
}

type FormData = {
  codigoUnidad: string
  nombre:       string
  tipo:         string
}

const FORM_VACIO: FormData = {
  codigoUnidad: "",
  nombre:       "",
  tipo:         "",
}

const TIPOS = ["AULA", "LABORATORIO", "ADMIN", "OTRA"]

// ── Estilos compartidos ──────────────────────────────────────
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
  inputError: {
    borderColor: "var(--color-error)",
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

// ── Modal confirmación ───────────────────────────────────────
function ModalConfirmar({
  mensaje,
  onConfirmar,
  onCancelar,
}: {
  mensaje:     string
  onConfirmar: () => void
  onCancelar:  () => void
}) {
  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(0,0,0,0.4)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         "var(--z-modal)",
      }}
      onClick={onCancelar}
    >
      <div
        style={{
          background:   "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          padding:      "var(--space-6)",
          maxWidth:     360,
          width:        "90%",
          boxShadow:    "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize:     "var(--text-base)",
            fontWeight:   "var(--font-medium)",
            color:        "var(--color-text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          Confirmar acción
        </h3>
        <p
          style={{
            fontSize:     "var(--text-sm)",
            color:        "var(--color-text-secondary)",
            marginBottom: "var(--space-6)",
          }}
        >
          {mensaje}
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{
              padding:      "8px 16px",
              borderRadius: "var(--radius-lg)",
              border:       "1px solid var(--color-border-strong)",
              background:   "transparent",
              fontSize:     "var(--text-sm)",
              fontWeight:   "var(--font-medium)",
              color:        "var(--color-text-primary)",
              cursor:       "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              padding:      "8px 16px",
              borderRadius: "var(--radius-lg)",
              border:       "none",
              background:   "var(--color-error)",
              fontSize:     "var(--text-sm)",
              fontWeight:   "var(--font-medium)",
              color:        "white",
              cursor:       "pointer",
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Badge tipo ───────────────────────────────────────────────
const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
  AULA:        { bg: "var(--color-accent-light)",   color: "#0D5F72" },
  LABORATORIO: { bg: "var(--color-primary-subtle)", color: "var(--color-primary)" },
  ADMIN:       { bg: "var(--color-warning-bg)",     color: "var(--color-warning-text)" },
  OTRA:        { bg: "var(--color-surface-raised)", color: "var(--color-text-secondary)" },
}

function BadgeTipo({ tipo }: { tipo: string | null }) {
  if (!tipo) return <span style={{ color: "var(--color-text-hint)", fontSize: "var(--text-xs)" }}>—</span>
  const colors = TIPO_COLORS[tipo] ?? TIPO_COLORS["OTRA"]
  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        padding:      "3px 8px",
        borderRadius: "20px",
        fontSize:     "var(--text-xs)",
        fontWeight:   "var(--font-medium)",
        background:   colors.bg,
        color:        colors.color,
      }}
    >
      {tipo}
    </span>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function UnidadesPage() {
  const { authHeaders } = useAuth()

  const [unidades,    setUnidades]    = useState<Unidad[]>([])
  const [loading,     setLoading]     = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando,    setEditando]    = useState<number | null>(null)
  const [form,        setForm]        = useState<FormData>(FORM_VACIO)
  const [formErrors,  setFormErrors]  = useState<Partial<FormData>>({})
  const [error,       setError]       = useState<string | null>(null)
  const [guardando,   setGuardando]   = useState(false)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  // ── Carga ──────────────────────────────────────────────────
  async function cargarUnidades() {
    try {
      const res = await fetch("/api/unidades", { headers: authHeaders })
      if (!res.ok) throw new Error()
      setUnidades(await res.json())
    } catch {
      setError("Error cargando unidades")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargarUnidades()
  }, [authHeaders.Authorization])

  // ── Form ───────────────────────────────────────────────────
  function abrirCrear() {
    setForm(FORM_VACIO)
    setFormErrors({})
    setEditando(null)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(u: Unidad) {
    setForm({
      codigoUnidad: String(u.codigoUnidad),
      nombre:       u.nombre,
      tipo:         u.tipo ?? "",
    })
    setFormErrors({})
    setEditando(u.id)
    setMostrarForm(true)
    setError(null)
  }

  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setFormErrors({})
    setError(null)
  }

  // ── Validación ─────────────────────────────────────────────
  function validar(): boolean {
    const errors: Partial<FormData> = {}
    if (!form.nombre.trim()) errors.nombre = "El nombre es requerido"
    if (!editando && !form.codigoUnidad.trim()) {
      errors.codigoUnidad = "El código es requerido"
    } else if (!editando && isNaN(Number(form.codigoUnidad))) {
      errors.codigoUnidad = "El código debe ser un número"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Guardar ────────────────────────────────────────────────
  async function guardar() {
    if (!validar()) return

    setGuardando(true)
    setError(null)

    try {
      const url    = editando ? `/api/unidades/${editando}` : "/api/unidades"
      const method = editando ? "PATCH" : "POST"

      const body = {
        nombre: form.nombre,
        tipo:   form.tipo || undefined,
        ...(!editando && { codigoUnidad: Number(form.codigoUnidad) }),
      }

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando unidad")
        return
      }

      await cargarUnidades()
      cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  // ── Eliminar ───────────────────────────────────────────────
  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/unidades/${id}`, {
        method:  "DELETE",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando unidad")
        return
      }
      await cargarUnidades()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "var(--space-12)",
          color:          "var(--color-text-hint)",
          fontSize:       "var(--text-sm)",
        }}
      >
        Cargando unidades...
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta unidad? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "var(--space-6)",
          maxWidth:      1100,
        }}
      >

        {/* Header */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize:   "var(--text-xl)",
                fontWeight: "var(--font-medium)",
                color:      "var(--color-text-primary)",
              }}
            >
              Unidades Organizativas
            </h1>
            <p
              style={{
                fontSize:  "var(--text-sm)",
                color:     "var(--color-text-secondary)",
                marginTop: "var(--space-1)",
              }}
            >
              {unidades.length} unidad{unidades.length !== 1 ? "es" : ""} registrada{unidades.length !== 1 ? "s" : ""}
            </p>
          </div>

          {!mostrarForm && (
            <button
              onClick={abrirCrear}
              style={{
                padding:      "9px 16px",
                borderRadius: "var(--radius-lg)",
                border:       "none",
                background:   "var(--color-primary)",
                color:        "white",
                fontSize:     "var(--text-sm)",
                fontWeight:   "var(--font-medium)",
                cursor:       "pointer",
              }}
            >
              + Nueva unidad
            </button>
          )}
        </div>

        {/* Error global */}
        {error && (
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "var(--space-2)",
              padding:      "10px 14px",
              borderRadius: "var(--radius-md)",
              background:   "var(--color-error-bg)",
              border:       "1px solid var(--color-error)",
              fontSize:     "var(--text-xs)",
              color:        "var(--color-error)",
            }}
            role="alert"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: "auto",
                background: "none",
                border:     "none",
                cursor:     "pointer",
                color:      "var(--color-error)",
                fontSize:   "var(--text-base)",
                lineHeight: 1,
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        )}

        {/* Formulario */}
        {mostrarForm && (
          <div
            style={{
              background:   "var(--color-surface)",
              border:       "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding:      "var(--space-6)",
              maxWidth:     480,
            }}
          >
            <h2
              style={{
                fontSize:     "var(--text-base)",
                fontWeight:   "var(--font-medium)",
                color:        "var(--color-text-primary)",
                marginBottom: "var(--space-6)",
              }}
            >
              {editando ? "Editar unidad" : "Nueva unidad"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

              {/* Código — solo en creación */}
              {!editando && (
                <div>
                  <label htmlFor="field-codigo" style={s.label}>
                    Código <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <input
                    id="field-codigo"
                    type="number"
                    value={form.codigoUnidad}
                    onChange={e => {
                      setForm(prev => ({ ...prev, codigoUnidad: e.target.value }))
                      if (formErrors.codigoUnidad) setFormErrors(prev => ({ ...prev, codigoUnidad: undefined }))
                    }}
                    style={{
                      ...s.input,
                      ...(formErrors.codigoUnidad ? s.inputError : {}),
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "var(--color-accent)"
                      e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = formErrors.codigoUnidad ? "var(--color-error)" : "var(--color-border)"
                      e.target.style.boxShadow   = "none"
                    }}
                    placeholder="Ej: 101"
                  />
                  {formErrors.codigoUnidad && (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
                      {formErrors.codigoUnidad}
                    </span>
                  )}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label htmlFor="field-nombre" style={s.label}>
                  Nombre <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <input
                  id="field-nombre"
                  value={form.nombre}
                  onChange={e => {
                    setForm(prev => ({ ...prev, nombre: e.target.value }))
                    if (formErrors.nombre) setFormErrors(prev => ({ ...prev, nombre: undefined }))
                  }}
                  style={{
                    ...s.input,
                    ...(formErrors.nombre ? s.inputError : {}),
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "var(--color-accent)"
                    e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = formErrors.nombre ? "var(--color-error)" : "var(--color-border)"
                    e.target.style.boxShadow   = "none"
                  }}
                  placeholder="Ej: Aula 12"
                />
                {formErrors.nombre && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
                    {formErrors.nombre}
                  </span>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label htmlFor="field-tipo" style={s.label}>Tipo</label>
                <select
                  id="field-tipo"
                  value={form.tipo}
                  onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                  style={{
                    ...s.input,
                    cursor: "pointer",
                    appearance: "auto",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "var(--color-accent)"
                    e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "var(--color-border)"
                    e.target.style.boxShadow   = "none"
                  }}
                >
                  <option value="">Sin tipo</option>
                  {TIPOS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Acciones */}
            <div
              style={{
                display:        "flex",
                gap:            "var(--space-2)",
                marginTop:      "var(--space-6)",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={cancelar}
                style={{
                  padding:      "8px 16px",
                  borderRadius: "var(--radius-lg)",
                  border:       "1px solid var(--color-border-strong)",
                  background:   "transparent",
                  fontSize:     "var(--text-sm)",
                  fontWeight:   "var(--font-medium)",
                  color:        "var(--color-text-primary)",
                  cursor:       "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{
                  padding:      "8px 16px",
                  borderRadius: "var(--radius-lg)",
                  border:       "none",
                  background:   "var(--color-primary)",
                  fontSize:     "var(--text-sm)",
                  fontWeight:   "var(--font-medium)",
                  color:        "white",
                  cursor:       guardando ? "not-allowed" : "pointer",
                  opacity:      guardando ? 0.6 : 1,
                }}
                aria-busy={guardando}
              >
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear unidad"}
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div
          style={{
            background:   "var(--color-surface)",
            border:       "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow:     "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Código", "Nombre", "Tipo", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unidades.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      padding:   "var(--space-12)",
                      fontSize:  "var(--text-sm)",
                      color:     "var(--color-text-hint)",
                    }}
                  >
                    No hay unidades registradas
                  </td>
                </tr>
              ) : (
                unidades.map(u => (
                  <tr
                    key={u.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    style={{ transition: "background 0.1s" }}
                  >
                    <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                      {u.codigoUnidad}
                    </td>
                    <td style={s.td}>{u.nombre}</td>
                    <td style={s.td}><BadgeTipo tipo={u.tipo} /></td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: "var(--space-3)" }}>
                        <button
                          onClick={() => abrirEditar(u)}
                          style={{
                            background: "none",
                            border:     "none",
                            fontSize:   "var(--text-xs)",
                            fontWeight: "var(--font-medium)",
                            color:      "var(--color-accent)",
                            cursor:     "pointer",
                            padding:    0,
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmarId(u.id)}
                          style={{
                            background: "none",
                            border:     "none",
                            fontSize:   "var(--text-xs)",
                            fontWeight: "var(--font-medium)",
                            color:      "var(--color-error)",
                            cursor:     "pointer",
                            padding:    0,
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}
