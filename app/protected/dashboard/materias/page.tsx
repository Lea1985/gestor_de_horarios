// app/protected/dashboard/materias/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Materia = {
  id: number
  nombre: string
  activo: boolean
}

type FormData = {
  nombre: string
}

const FORM_VACIO: FormData = {
  nombre: "",
}

const s = {
  label: {
    fontSize: "var(--text-xs)",
    fontWeight: "var(--font-medium)" as const,
    color: "var(--color-text-primary)",
    display: "block" as const,
    marginBottom: "var(--space-1)",
  },
  input: {
    width: "100%",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "8px 12px",
    fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)",
    outline: "none",
  },
  th: {
    textAlign: "left" as const,
    fontSize: "var(--text-2xs)",
    fontWeight: "var(--font-medium)" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "var(--color-text-secondary)",
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border-strong)",
    background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px",
    fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}

export default function MateriasPage() {
  const { authHeaders } = useAuth()

  const [materias, setMaterias] = useState<Materia[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VACIO)

  async function cargar() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/materias", {
        headers: authHeaders,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error cargando materias")
        return
      }

      setMaterias(data)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      cargar()
    }
  }, [authHeaders.Authorization])

  function abrirNuevo() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(item: Materia) {
    setEditandoId(item.id)
    setForm({
      nombre: item.nombre,
    })
    setMostrarForm(true)
    setError(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  async function guardar() {
    try {
      setGuardando(true)
      setError(null)

      if (!form.nombre.trim()) {
        setError("Ingresá un nombre")
        return
      }

      const url =
        editandoId === null
          ? "/api/materias"
          : `/api/materias/${editandoId}`

      const method =
        editandoId === null
          ? "POST"
          : "PATCH"

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          nombre: form.nombre.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error guardando materia")
        return
      }

      cerrarForm()
      cargar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    if (!confirm("¿Eliminar materia?")) return

    try {
      const res = await fetch(`/api/materias/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error eliminando")
        return
      }

      cargar()
    } catch {
      setError("Error de red")
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "var(--space-12)",
          color: "var(--color-text-hint)",
          fontSize: "var(--text-sm)",
        }}
      >
        Cargando materias...
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "var(--font-medium)",
              color: "var(--color-text-primary)",
            }}
          >
            Materias
          </h1>

          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-1)",
            }}
          >
            {materias.length} materia
            {materias.length !== 1 ? "s" : ""} registrada
            {materias.length !== 1 ? "s" : ""}
          </p>
        </div>

        {!mostrarForm && (
          <button
            onClick={abrirNuevo}
            style={{
              padding: "9px 16px",
              borderRadius: "var(--radius-lg)",
              border: "none",
              background: "var(--color-primary)",
              color: "white",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              cursor: "pointer",
            }}
          >
            + Nueva materia
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-error-bg)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
            fontSize: "var(--text-xs)",
          }}
        >
          {error}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-6)",
            maxWidth: 500,
          }}
        >
          <h2
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-medium)",
              marginBottom: "var(--space-6)",
              color: "var(--color-text-primary)",
            }}
          >
            {editandoId === null
              ? "Nueva materia"
              : "Editar materia"}
          </h2>

          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <div>
              <label style={s.label}>Nombre</label>

              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nombre: e.target.value,
                  })
                }
                style={s.input}
                placeholder="Ej: Matemática"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              justifyContent: "flex-end",
              marginTop: "var(--space-6)",
            }}
          >
            <button
              onClick={cerrarForm}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border-strong)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>

            <button
              onClick={guardar}
              disabled={guardando}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-lg)",
                border: "none",
                background: "var(--color-primary)",
                color: "white",
                cursor: guardando ? "not-allowed" : "pointer",
                opacity: guardando ? 0.7 : 1,
              }}
            >
              {guardando
                ? "Guardando..."
                : editandoId === null
                ? "Crear"
                : "Actualizar"}
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={s.th}>ID</th>
              <th style={s.th}>Nombre</th>
              <th style={s.th}></th>
            </tr>
          </thead>

          <tbody>
            {materias.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    textAlign: "center",
                    padding: "var(--space-12)",
                    color: "var(--color-text-hint)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Sin materias cargadas
                </td>
              </tr>
            ) : (
              materias.map((item) => (
                <tr
                  key={item.id}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-surface-raised)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "transparent")
                  }
                >
                  <td
                    style={{
                      ...s.td,
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    {item.id}
                  </td>

                  <td style={s.td}>{item.nombre}</td>

                  <td style={s.td}>
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-3)",
                      }}
                    >
                      <button
                        onClick={() =>
                          abrirEditar(item)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-accent)",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: "var(--text-xs)",
                          fontWeight:
                            "var(--font-medium)",
                        }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          eliminar(item.id)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-error)",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: "var(--text-xs)",
                          fontWeight:
                            "var(--font-medium)",
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
  )
}