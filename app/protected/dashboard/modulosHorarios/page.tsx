"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { minutosAHora, horaAMinutos } from "@/lib/helpers/tiempo"

type Modulo = {
  id: number
  dia_semana: string
  hora_desde: number
  hora_hasta: number
  turnoId?: number | null
  activo: boolean
}

type Turno = {
  id: number
  nombre: string
  horaInicio: number
  horaFin: number
}

type FormData = {
  dia_semana: string
  hora_desde: string
  hora_hasta: string
  turnoId: string
}

const FORM_VACIO: FormData = {
  dia_semana: "",
  hora_desde: "",
  hora_hasta: "",
  turnoId: "",
}

const DIAS = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
]

const s = {
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
      onClick={onCancelar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "var(--z-modal)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          maxWidth: 360,
          width: "90%",
        }}
      >
        <h3 style={{ marginBottom: 8 }}>Confirmar acción</h3>
        <p style={{ marginBottom: 16 }}>{mensaje}</p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancelar}>Cancelar</button>
          <button
            onClick={onConfirmar}
            style={{
              background: "var(--color-error)",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ModulosHorariosPage() {
  const { authHeaders } = useAuth()

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modulos, setModulos] = useState<Modulo[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])

  const [mostrarForm, setMostrarForm] = useState(false)
  const [modoMasivo, setModoMasivo] = useState(false)

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  const [form, setForm] = useState<FormData>(FORM_VACIO)

  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([])

  const [formMasivo, setFormMasivo] = useState({
    hora_inicio: "",
    duracion_modulo: "40",
    cantidad_modulos: "8",
    turnoId: "",
  })

  const [recreos, setRecreos] = useState([
    { despuesDe: "2", duracion: "10" },
  ])

  async function cargar() {
    try {
      setLoading(true)
      setError(null)

      const [resModulos, resTurnos] = await Promise.all([
        fetch("/api/modulosHorarios", { headers: authHeaders }),
        fetch("/api/turnos", { headers: authHeaders }),
      ])

      const dataModulos = await resModulos.json()
      const dataTurnos = await resTurnos.json()

      if (!resModulos.ok) throw new Error(dataModulos.error)
      if (!resTurnos.ok) throw new Error(dataTurnos.error)

      setModulos(dataModulos)
      setTurnos(dataTurnos)
    } catch (e: any) {
      setError(e.message || "Error de red")
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
    setModoMasivo(false)
    setError(null)
  }

  function abrirMasivo() {
    setMostrarForm(false)
    setModoMasivo(true)
    setError(null)
  }

  function abrirEditar(m: Modulo) {
    setEditandoId(m.id)
    setForm({
      dia_semana: m.dia_semana,
      hora_desde: minutosAHora(m.hora_desde),
      hora_hasta: minutosAHora(m.hora_hasta),
      turnoId: m.turnoId ? String(m.turnoId) : "",
    })
    setMostrarForm(true)
    setModoMasivo(false)
    setError(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setModoMasivo(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  function toggleDia(dia: string) {
    setDiasSeleccionados((prev) =>
      prev.includes(dia)
        ? prev.filter((d) => d !== dia)
        : [...prev, dia]
    )
  }

  function agregarRecreo() {
    setRecreos((prev) => [...prev, { despuesDe: "", duracion: "" }])
  }

  function actualizarRecreo(
    index: number,
    campo: "despuesDe" | "duracion",
    valor: string
  ) {
    setRecreos((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [campo]: valor } : r))
    )
  }

  function eliminarRecreo(index: number) {
    setRecreos((prev) => prev.filter((_, i) => i !== index))
  }

  async function guardar() {
    try {
      setGuardando(true)
      setError(null)

      if (!form.dia_semana || !form.hora_desde || !form.hora_hasta) {
        setError("Completá los campos")
        return
      }

      const desde = horaAMinutos(form.hora_desde)
      const hasta = horaAMinutos(form.hora_hasta)

      if (desde >= hasta) {
        setError("Rango horario inválido")
        return
      }

      const body = {
        dia_semana: form.dia_semana,
        hora_desde: desde,
        hora_hasta: hasta,
        turnoId: form.turnoId ? Number(form.turnoId) : null,
      }

      const url = editandoId
        ? `/api/modulosHorarios/${editandoId}`
        : "/api/modulosHorarios"

      const method = editandoId ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error guardando")
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

  async function guardarMasivo() {
    try {
      setGuardando(true)
      setError(null)

      if (!formMasivo.hora_inicio) {
        setError("Definí hora de inicio")
        return
      }

      if (diasSeleccionados.length === 0) {
        setError("Seleccioná al menos un día")
        return
      }

      const inicio = horaAMinutos(formMasivo.hora_inicio)
      const duracion = Number(formMasivo.duracion_modulo)
      const cantidad = Number(formMasivo.cantidad_modulos)

      const pausas = recreos
        .filter((r) => r.despuesDe && r.duracion)
        .map((r) => ({
          despuesDe: Number(r.despuesDe),
          duracion: Number(r.duracion),
        }))

      const requests: Promise<Response>[] = []

      for (const dia of diasSeleccionados) {
        let cursor = inicio

        for (let i = 1; i <= cantidad; i++) {
          const desde = cursor
          const hasta = cursor + duracion

          requests.push(
            fetch("/api/modulosHorarios", {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({
                dia_semana: dia,
                hora_desde: desde,
                hora_hasta: hasta,
                turnoId: formMasivo.turnoId
                  ? Number(formMasivo.turnoId)
                  : null,
              }),
            })
          )

          cursor = hasta

          const pausa = pausas.find((p) => p.despuesDe === i)
          if (pausa) {
            cursor += pausa.duracion
          }
        }
      }

      const responses = await Promise.all(requests)

      if (responses.some((r) => !r.ok)) {
        setError("Algunos módulos no pudieron crearse (puede haber duplicados)")
      }

      setModoMasivo(false)
      setDiasSeleccionados([])
      setRecreos([{ despuesDe: "2", duracion: "10" }])

      await cargar()
    } catch {
      setError("Error generando módulos")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    try {
      await fetch(`/api/modulosHorarios/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      })

      cargar()
    } catch {
      setError("Error eliminando")
    } finally {
      setConfirmarId(null)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--color-text-hint)",
        }}
      >
        Cargando módulos...
      </div>
    )
  }

  return (
    <>
      {confirmarId && (
        <ModalConfirmar
          mensaje="¿Eliminar módulo?"
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1100,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-medium)",
              }}
            >
              Módulos Horarios
            </h1>

            <p style={{ color: "var(--color-text-secondary)" }}>
              {modulos.length} módulo{modulos.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {!mostrarForm && !modoMasivo && (
              <>
                <button
                  onClick={abrirNuevo}
                  style={{
                    background: "var(--color-primary)",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                  }}
                >
                  + Nuevo módulo
                </button>

                <button
                  onClick={abrirMasivo}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                  }}
                >
                  Generación masiva
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div style={{ color: "var(--color-error)" }}>{error}</div>}

        {mostrarForm && (
          <div
            style={{
              border: "1px solid var(--color-border)",
              padding: 20,
              borderRadius: 12,
            }}
          >
            <h3>{editandoId ? "Editar módulo" : "Nuevo módulo"}</h3>

            <div style={{ display: "grid", gap: 12 }}>
              <select
                value={form.dia_semana}
                onChange={(e) =>
                  setForm({ ...form, dia_semana: e.target.value })
                }
              >
                <option value="">Día</option>
                {DIAS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>

              <input
                type="time"
                value={form.hora_desde}
                onChange={(e) =>
                  setForm({ ...form, hora_desde: e.target.value })
                }
              />

              <input
                type="time"
                value={form.hora_hasta}
                onChange={(e) =>
                  setForm({ ...form, hora_hasta: e.target.value })
                }
              />

              <select
                value={form.turnoId}
                onChange={(e) =>
                  setForm({ ...form, turnoId: e.target.value })
                }
              >
                <option value="">Sin turno</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={guardar} disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar"}
                </button>

                <button onClick={cerrarForm}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {modoMasivo && (
          <div
            style={{
              border: "1px solid var(--color-border)",
              padding: 20,
              borderRadius: 12,
            }}
          >
            <h3>Generar grilla horaria</h3>

            <div style={{ display: "grid", gap: 12 }}>
              <input
                type="time"
                value={formMasivo.hora_inicio}
                onChange={(e) =>
                  setFormMasivo({
                    ...formMasivo,
                    hora_inicio: e.target.value,
                  })
                }
              />

              <input
                type="number"
                placeholder="Duración módulo"
                value={formMasivo.duracion_modulo}
                onChange={(e) =>
                  setFormMasivo({
                    ...formMasivo,
                    duracion_modulo: e.target.value,
                  })
                }
              />

              <input
                type="number"
                placeholder="Cantidad módulos"
                value={formMasivo.cantidad_modulos}
                onChange={(e) =>
                  setFormMasivo({
                    ...formMasivo,
                    cantidad_modulos: e.target.value,
                  })
                }
              />

              <select
                value={formMasivo.turnoId}
                onChange={(e) =>
                  setFormMasivo({
                    ...formMasivo,
                    turnoId: e.target.value,
                  })
                }
              >
                <option value="">Sin turno</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DIAS.map((dia) => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: diasSeleccionados.includes(dia)
                        ? "var(--color-primary)"
                        : "transparent",
                      color: diasSeleccionados.includes(dia)
                        ? "white"
                        : "inherit",
                    }}
                  >
                    {dia}
                  </button>
                ))}
              </div>

              <div>
                <strong>Recreos</strong>

                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {recreos.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        placeholder="Después del módulo"
                        value={r.despuesDe}
                        onChange={(e) =>
                          actualizarRecreo(i, "despuesDe", e.target.value)
                        }
                      />

                      <input
                        type="number"
                        placeholder="Duración"
                        value={r.duracion}
                        onChange={(e) =>
                          actualizarRecreo(i, "duracion", e.target.value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() => eliminarRecreo(i)}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={agregarRecreo}
                  style={{ marginTop: 8 }}
                >
                  + Agregar recreo
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={guardarMasivo} disabled={guardando}>
                  {guardando ? "Generando..." : "Generar"}
                </button>

                <button onClick={cerrarForm}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={s.th}>Día</th>
              <th style={s.th}>Desde</th>
              <th style={s.th}>Hasta</th>
              <th style={s.th}>Turno</th>
              <th style={s.th}></th>
            </tr>
          </thead>

          <tbody>
            {modulos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                  Sin datos
                </td>
              </tr>
            ) : (
              modulos.map((m) => {
                const turno = turnos.find((t) => t.id === m.turnoId)

                return (
                  <tr key={m.id}>
                    <td style={s.td}>{m.dia_semana}</td>
                    <td style={s.td}>{minutosAHora(m.hora_desde)}</td>
                    <td style={s.td}>{minutosAHora(m.hora_hasta)}</td>
                    <td style={s.td}>{turno?.nombre || "—"}</td>

                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => abrirEditar(m)}>Editar</button>
                        <button onClick={() => setConfirmarId(m.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}