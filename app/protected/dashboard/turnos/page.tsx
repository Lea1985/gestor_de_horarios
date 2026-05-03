"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import {
  minutosAHora,
  horaAMinutos,
} from "@/lib/helpers/tiempo"

// ── Tipos ────────────────────────────────────────────────────
type Turno = {
  id: number
  nombre: string
  horaInicio: number
  horaFin: number
}

type FormData = {
  nombre: string
  horaInicio: string
  horaFin: string
}

const FORM_VACIO: FormData = {
  nombre: "",
  horaInicio: "",
  horaFin: "",
}

// ── Estilos compartidos ──────────────────────────────────────
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

// ── Página ───────────────────────────────────────────────────
export default function TurnosPage() {
  const { authHeaders } = useAuth()

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VACIO)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    try {
      const res = await fetch("/api/turnos", {
        headers: authHeaders,
      })

      if (!res.ok) throw new Error()

      setTurnos(await res.json())
    } catch {
      setError("Error cargando turnos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      cargar()
    }
  }, [authHeaders.Authorization])

  function abrirCrear() {
    setEditando(null)
    setForm(FORM_VACIO)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(turno: Turno) {
    setEditando(turno.id)

    setForm({
      nombre: turno.nombre,
      horaInicio: minutosAHora(turno.horaInicio),
      horaFin: minutosAHora(turno.horaFin),
    })

    setMostrarForm(true)
    setError(null)
  }

  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setError(null)
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }

    if (!form.horaInicio || !form.horaFin) {
      setError("Debe completar horario inicio y fin")
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const url = editando
        ? `/api/turnos/${editando}`
        : "/api/turnos"

      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          nombre: form.nombre,
          horaInicio: horaAMinutos(form.horaInicio),
          horaFin: horaAMinutos(form.horaFin),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando turno")
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
      const res = await fetch(`/api/turnos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando turno")
        return
      }

      await cargar()
    } catch {
      setError("Error de red")
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-12)",
          color: "var(--color-text-hint)",
          fontSize: "var(--text-sm)",
        }}
      >
        Cargando turnos...
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: 1100,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            Turnos
          </h1>

          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-1)",
            }}
          >
            {turnos.length} turno{turnos.length !== 1 ? "s" : ""} registrado
            {turnos.length !== 1 ? "s" : ""}
          </p>
        </div>

        {!mostrarForm && (
          <button
            onClick={abrirCrear}
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
            + Nuevo turno
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
            fontSize: "var(--text-xs)",
            color: "var(--color-error)",
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
            maxWidth: 480,
          }}
        >
          <h2
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-medium)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            {editando ? "Editar turno" : "Nuevo turno"}
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
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
                placeholder="Ej: Mañana"
              />
            </div>

            <div>
              <label style={s.label}>Hora inicio</label>
              <input
                type="time"
                value={form.horaInicio}
                onChange={(e) =>
                  setForm({
                    ...form,
                    horaInicio: e.target.value,
                  })
                }
                style={s.input}
              />
            </div>

            <div>
              <label style={s.label}>Hora fin</label>
              <input
                type="time"
                value={form.horaFin}
                onChange={(e) =>
                  setForm({
                    ...form,
                    horaFin: e.target.value,
                  })
                }
                style={s.input}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              marginTop: "var(--space-6)",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={cancelar}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border-strong)",
                background: "transparent",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-medium)",
                color: "var(--color-text-primary)",
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
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-medium)",
                color: "white",
                cursor: guardando ? "not-allowed" : "pointer",
                opacity: guardando ? 0.6 : 1,
              }}
            >
              {guardando
                ? "Guardando..."
                : editando
                ? "Guardar cambios"
                : "Crear turno"}
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
              {["Nombre", "Inicio", "Fin", ""].map((col) => (
                <th key={col} style={s.th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {turnos.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    padding: "var(--space-12)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-hint)",
                  }}
                >
                  No hay turnos registrados
                </td>
              </tr>
            ) : (
              turnos.map((turno) => (
                <tr
                  key={turno.id}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-surface-raised)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "transparent")
                  }
                  style={{
                    transition: "background 0.1s",
                  }}
                >
                  <td style={s.td}>{turno.nombre}</td>
                  <td style={s.td}>
                    {minutosAHora(turno.horaInicio)}
                  </td>
                  <td style={s.td}>
                    {minutosAHora(turno.horaFin)}
                  </td>

                  <td style={s.td}>
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-3)",
                      }}
                    >
                      <button
                        onClick={() =>
                          abrirEditar(turno)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "var(--text-xs)",
                          fontWeight:
                            "var(--font-medium)",
                          color:
                            "var(--color-accent)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          eliminar(turno.id)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "var(--text-xs)",
                          fontWeight:
                            "var(--font-medium)",
                          color:
                            "var(--color-error)",
                          cursor: "pointer",
                          padding: 0,
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