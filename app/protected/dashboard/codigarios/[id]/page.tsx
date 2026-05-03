// app/protected/dashboard/codigarios/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type Item = {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  activo: boolean
}

type Codigario = {
  id: number
  nombre: string
  descripcion: string | null
  items: Item[]
}

type FormData = {
  codigo: string
  nombre: string
  descripcion: string
}

const FORM_VACIO: FormData = {
  codigo: "",
  nombre: "",
  descripcion: "",
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

function ModalConfirmar({
  mensaje,
  onConfirmar,
  onCancelar,
}: {
  mensaje: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "var(--z-modal)",
      }}
      onClick={onCancelar}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          maxWidth: 360,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: "var(--text-base)",
            fontWeight: "var(--font-medium)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          Confirmar acción
        </h3>

        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-6)",
          }}
        >
          {mensaje}
        </p>

        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            justifyContent: "flex-end",
          }}
        >
          <button onClick={onCancelar}>Cancelar</button>
          <button onClick={onConfirmar}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function CodigarioDetallePage() {
  const params = useParams()
  const codigarioId = params.id as string
  const { authHeaders } = useAuth()

  const [codigario, setCodigario] = useState<Codigario | null>(null)
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState<FormData>(FORM_VACIO)
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({})

  const [error, setError] = useState<string | null>(null)

  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  const [editandoId, setEditandoId] = useState<number | null>(null)

  async function cargar() {
    try {
      setLoading(true)

      const res = await fetch(`/api/codigarios/${codigarioId}`, {
        headers: authHeaders,
      })

      if (!res.ok) throw new Error()

      const data = await res.json()
      setCodigario(data)
    } catch {
      setError("Error cargando codigario")
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
    setEditandoId(null)
    setForm(FORM_VACIO)
    setFormErrors({})
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(item: Item) {
    setEditandoId(item.id)

    setForm({
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion ?? "",
    })

    setFormErrors({})
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

  function validar() {
    const errors: Partial<FormData> = {}

    if (!form.codigo.trim()) errors.codigo = "Campo requerido"
    if (!form.nombre.trim()) errors.nombre = "Campo requerido"

    setFormErrors(errors)

    return Object.keys(errors).length === 0
  }

  async function guardar() {
    if (!validar()) return

    setGuardando(true)
    setError(null)

    try {
      const url =
        editandoId === null
          ? `/api/codigarios/${codigarioId}/items`
          : `/api/codigarios/${codigarioId}/items/${editandoId}`

      const method = editandoId === null ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando item")
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

  async function eliminarItem(itemId: number) {
    try {
      const res = await fetch(
        `/api/codigarios/${codigarioId}/items/${itemId}`,
        {
          method: "DELETE",
          headers: authHeaders,
        }
      )

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando item")
        return
      }

      await cargar()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  if (loading) return <div>Cargando...</div>

  if (!codigario) return <div>No encontrado</div>

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar este item?"
          onConfirmar={() => eliminarItem(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <Link href="/protected/dashboard/codigarios">
              ← Volver
            </Link>

            <h1>{codigario.nombre}</h1>

            <p>
              {codigario.descripcion ?? "Sin descripción"} ·{" "}
              {codigario.items.length} items
            </p>
          </div>

          {!mostrarForm && (
            <button onClick={abrirCrear}>
              + Nuevo item
            </button>
          )}
        </div>

        {error && <div>{error}</div>}

        {mostrarForm && (
          <div
            style={{
              border: "1px solid #ddd",
              padding: 20,
              borderRadius: 10,
            }}
          >
            <h2>
              {editandoId === null
                ? "Nuevo item"
                : `Editar item #${editandoId}`}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <label style={s.label}>Código</label>
                <input
                  value={form.codigo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      codigo: e.target.value,
                    })
                  }
                  style={s.input}
                />
                {formErrors.codigo && (
                  <small>{formErrors.codigo}</small>
                )}
              </div>

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
                {formErrors.nombre && (
                  <small>{formErrors.nombre}</small>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
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
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button onClick={cancelar}>
                Cancelar
              </button>

              <button
                onClick={guardar}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : editandoId === null
                  ? "Crear item"
                  : "Actualizar item"}
              </button>
            </div>
          </div>
        )}

        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={s.th}>Código</th>
              <th style={s.th}>Nombre</th>
              <th style={s.th}>Descripción</th>
              <th style={s.th}></th>
            </tr>
          </thead>

          <tbody>
            {codigario.items.map((item) => (
              <tr key={item.id}>
                <td style={s.td}>{item.codigo}</td>
                <td style={s.td}>{item.nombre}</td>
                <td style={s.td}>
                  {item.descripcion ?? "—"}
                </td>

                <td style={s.td}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => abrirEditar(item)}
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        setConfirmarId(item.id)
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}