// app/protected/dashboard/comisiones/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Curso = {
  id: number
  nombre: string
}

type Turno = {
  id: number
  nombre: string
}

type Unidad = {
  id: number
  nombre: string
  codigoUnidad: number
}

type Comision = {
  id: number
  nombre: string
  descripcion?: string | null
  cursoId: number
  turnoId: number
  unidadId?: number | null
  activo: boolean
  curso?: Curso
  turno?: Turno
  unidad?: Unidad | null
}

type FormData = {
  nombre: string
  descripcion: string
  cursoId: string
  turnoId: string
  unidadId: string
}

const FORM_VACIO: FormData = {
  nombre: "",
  descripcion: "",
  cursoId: "",
  turnoId: "",
  unidadId: "",
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

export default function ComisionesPage() {
  const { authHeaders } = useAuth()

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VACIO)

  async function cargarTodo() {
    try {
      setLoading(true)
      setError(null)

      const [r1, r2, r3, r4] = await Promise.all([
        fetch("/api/comisiones", { headers: authHeaders }),
        fetch("/api/cursos", { headers: authHeaders }),
        fetch("/api/turnos", { headers: authHeaders }),
        fetch("/api/unidades", { headers: authHeaders }),
      ])

      const d1 = await r1.json()
      const d2 = await r2.json()
      const d3 = await r3.json()
      const d4 = await r4.json()

      if (!r1.ok) throw new Error(d1.error)
      if (!r2.ok) throw new Error(d2.error)
      if (!r3.ok) throw new Error(d3.error)
      if (!r4.ok) throw new Error(d4.error)

      setComisiones(d1)
      setCursos(d2)
      setTurnos(d3)
      setUnidades(d4)
    } catch (e: any) {
      setError(e.message || "Error cargando datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      cargarTodo()
    }
  }, [authHeaders.Authorization])

  function abrirNuevo() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(item: Comision) {
    setEditandoId(item.id)

    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      cursoId: String(item.cursoId),
      turnoId: String(item.turnoId),
      unidadId: item.unidadId ? String(item.unidadId) : "",
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

      if (!form.nombre || !form.cursoId || !form.turnoId) {
        setError("Completá nombre, curso y turno")
        return
      }

      const body = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        cursoId: Number(form.cursoId),
        turnoId: Number(form.turnoId),
        unidadId: form.unidadId ? Number(form.unidadId) : null,
      }

      const url =
        editandoId === null
          ? "/api/comisiones"
          : `/api/comisiones/${editandoId}`

      const method =
        editandoId === null
          ? "POST"
          : "PATCH"

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error guardando comisión")
        return
      }

      cerrarForm()
      cargarTodo()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    if (!confirm("¿Eliminar comisión?")) return

    try {
      const res = await fetch(`/api/comisiones/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error eliminando")
        return
      }

      cargarTodo()
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
        }}
      >
        Cargando comisiones...
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: 1200,
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
            Comisiones
          </h1>

          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-1)",
            }}
          >
            {comisiones.length} registro
            {comisiones.length !== 1 ? "s" : ""}
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
            + Nueva comisión
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

      {/* Form */}
      {mostrarForm && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-6)",
            maxWidth: 700,
          }}
        >
          <h2
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-medium)",
              marginBottom: "var(--space-6)",
            }}
          >
            {editandoId === null
              ? "Nueva comisión"
              : "Editar comisión"}
          </h2>

          <div
            style={{
              display: "grid",
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
              />
            </div>

            <div>
              <label style={s.label}>Descripción</label>
              <input
                value={form.descripcion}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descripcion: e.target.value,
                  })
                }
                style={s.input}
              />
            </div>

            <div>
              <label style={s.label}>Curso</label>
              <select
                value={form.cursoId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cursoId: e.target.value,
                  })
                }
                style={s.input}
              >
                <option value="">Seleccionar</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={s.label}>Turno</label>
              <select
                value={form.turnoId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    turnoId: e.target.value,
                  })
                }
                style={s.input}
              >
                <option value="">Seleccionar</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={s.label}>Unidad</label>
              <select
                value={form.unidadId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unidadId: e.target.value,
                  })
                }
                style={s.input}
              >
                <option value="">Sin unidad</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigoUnidad} - {u.nombre}
                  </option>
                ))}
              </select>
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
                cursor: "pointer",
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
              <th style={s.th}>Nombre</th>
              <th style={s.th}>Curso</th>
              <th style={s.th}>Turno</th>
              <th style={s.th}>Unidad</th>
              <th style={s.th}></th>
            </tr>
          </thead>

          <tbody>
            {comisiones.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "var(--space-12)",
                    color: "var(--color-text-hint)",
                  }}
                >
                  Sin registros
                </td>
              </tr>
            ) : (
              comisiones.map((item) => (
                <tr key={item.id}>
                  <td style={s.td}>{item.nombre}</td>
                  <td style={s.td}>
                    {item.curso?.nombre || "-"}
                  </td>
                  <td style={s.td}>
                    {item.turno?.nombre || "-"}
                  </td>
                  <td style={s.td}>
                    {item.unidad
                      ? `${item.unidad.nombre}`
                      : "-"}
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