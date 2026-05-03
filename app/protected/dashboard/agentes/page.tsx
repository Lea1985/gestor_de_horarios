"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

// ── Tipos ────────────────────────────────────────────────────
type Agente = {
  agenteId: number
  agente: {
    id:        number
    nombre:    string
    apellido:  string
    documento: string
    email:     string | null
    telefono:  string | null
    domicilio: string | null
  }
}

type FormData = {
  nombre:    string
  apellido:  string
  documento: string
  email:     string
  telefono:  string
  domicilio: string
}

// ── Configuración de campos ──────────────────────────────────
// Array explícito — orden garantizado, labels legibles
const CAMPOS: { key: keyof FormData; label: string; required?: boolean }[] = [
  { key: "nombre",    label: "Nombre",    required: true },
  { key: "apellido",  label: "Apellido",  required: true },
  { key: "documento", label: "Documento", required: true },
  { key: "email",     label: "Email" },
  { key: "telefono",  label: "Teléfono" },
  { key: "domicilio", label: "Domicilio" },
]

const FORM_VACIO: FormData = {
  nombre: "", apellido: "", documento: "",
  email: "", telefono: "", domicilio: "",
}

// ── Estilos compartidos ──────────────────────────────────────
const s = {
  label: {
    fontSize:    "var(--text-xs)",
    fontWeight:  "var(--font-medium)" as const,
    color:       "var(--color-text-primary)",
    display:     "block" as const,
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
    textAlign:     "left"    as const,
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
    padding:     "10px 12px",
    fontSize:    "var(--text-sm)",
    color:       "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}

// ── Componente modal de confirmación ────────────────────────
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

// ── Página principal ─────────────────────────────────────────
export default function AgentesPage() {
  const { authHeaders } = useAuth()

  const [agentes,      setAgentes]      = useState<Agente[]>([])
  const [loading,      setLoading]      = useState(true)
  const [mostrarForm,  setMostrarForm]  = useState(false)
  const [editando,     setEditando]     = useState<number | null>(null)
  const [form,         setForm]         = useState<FormData>(FORM_VACIO)
  const [formErrors,   setFormErrors]   = useState<Partial<FormData>>({})
  const [error,        setError]        = useState<string | null>(null)
  const [guardando,    setGuardando]    = useState(false)
  const [confirmarId,  setConfirmarId]  = useState<number | null>(null)

  // ── Carga ──────────────────────────────────────────────────
  async function cargarAgentes() {
    try {
      const res = await fetch("/api/agentes", { headers: authHeaders })
      if (!res.ok) throw new Error()
      setAgentes(await res.json())
    } catch {
      setError("Error cargando agentes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargarAgentes()
  }, [authHeaders.Authorization])

  // ── Form ───────────────────────────────────────────────────
  function abrirCrear() {
    setForm(FORM_VACIO)
    setFormErrors({})
    setEditando(null)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(a: Agente) {
    setForm({
      nombre:    a.agente.nombre,
      apellido:  a.agente.apellido,
      documento: a.agente.documento,
      email:     a.agente.email     ?? "",
      telefono:  a.agente.telefono  ?? "",
      domicilio: a.agente.domicilio ?? "",
    })
    setFormErrors({})
    setEditando(a.agente.id)
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
    CAMPOS.filter(c => c.required).forEach(c => {
      if (!form[c.key].trim()) errors[c.key] = "Campo requerido"
    })
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Guardar ────────────────────────────────────────────────
  async function guardar() {
    if (!validar()) return

    setGuardando(true)
    setError(null)

    try {
      const url    = editando ? `/api/agentes/${editando}` : "/api/agentes"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body:    JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando agente")
        return
      }

      await cargarAgentes()
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
      const res = await fetch(`/api/agentes/${id}`, {
        method:  "DELETE",
        headers: authHeaders,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando")
        return
      }

      await cargarAgentes()
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
        Cargando agentes...
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Modal confirmación eliminar */}
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar este agente? Esta acción no se puede deshacer."
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
              Agentes
            </h1>
            <p
              style={{
                fontSize:  "var(--text-sm)",
                color:     "var(--color-text-secondary)",
                marginTop: "var(--space-1)",
              }}
            >
              {agentes.length} agente{agentes.length !== 1 ? "s" : ""} registrado{agentes.length !== 1 ? "s" : ""}
            </p>
          </div>

          {!mostrarForm && (
            <button
              onClick={abrirCrear}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "var(--space-1)",
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
              + Nuevo agente
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
              maxWidth:     520,
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
              {editando ? "Editar agente" : "Nuevo agente"}
            </h2>

            <div
              style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr",
                gap:                 "var(--space-4)",
              }}
            >
              {CAMPOS.map(({ key, label, required }) => (
                <div
                  key={key}
                  style={{
                    // domicilio ocupa el ancho completo
                    gridColumn: key === "domicilio" ? "1 / -1" : undefined,
                  }}
                >
                  <label htmlFor={`field-${key}`} style={s.label}>
                    {label}
                    {required && (
                      <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>
                    )}
                  </label>
                  <input
                    id={`field-${key}`}
                    value={form[key]}
                    onChange={e => {
                      setForm(prev => ({ ...prev, [key]: e.target.value }))
                      if (formErrors[key]) {
                        setFormErrors(prev => ({ ...prev, [key]: undefined }))
                      }
                    }}
                    style={{
                      ...s.input,
                      ...(formErrors[key] ? s.inputError : {}),
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "var(--color-accent)"
                      e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = formErrors[key]
                        ? "var(--color-error)"
                        : "var(--color-border)"
                      e.target.style.boxShadow = "none"
                    }}
                    aria-invalid={!!formErrors[key]}
                  />
                  {formErrors[key] && (
                    <span
                      style={{
                        fontSize:  "var(--text-xs)",
                        color:     "var(--color-error)",
                        marginTop: "var(--space-1)",
                        display:   "block",
                      }}
                    >
                      {formErrors[key]}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                display:    "flex",
                gap:        "var(--space-2)",
                marginTop:  "var(--space-6)",
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
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear agente"}
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div
          style={{
            background:    "var(--color-surface)",
            border:        "1px solid var(--color-border)",
            borderRadius:  "var(--radius-xl)",
            overflow:      "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nombre", "Apellido", "Documento", "Email", "Teléfono", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {agentes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding:   "var(--space-12)",
                      fontSize:  "var(--text-sm)",
                      color:     "var(--color-text-hint)",
                    }}
                  >
                    No hay agentes registrados
                  </td>
                </tr>
              ) : (
                agentes.map(a => (
                  <tr
                    key={a.agenteId}
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.background = "var(--color-surface-raised)")
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td style={s.td}>{a.agente.nombre}</td>
                    <td style={s.td}>{a.agente.apellido}</td>
                    <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                      {a.agente.documento}
                    </td>
                    <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                      {a.agente.email ?? "—"}
                    </td>
                    <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                      {a.agente.telefono ?? "—"}
                    </td>
                    <td style={{ ...s.td, borderBottom: s.td.borderBottom }}>
                      <div style={{ display: "flex", gap: "var(--space-3)" }}>
                        <button
                          onClick={() => abrirEditar(a)}
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
                          onClick={() => setConfirmarId(a.agente.id)}
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
