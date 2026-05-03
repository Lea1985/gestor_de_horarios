// app/protected/dashboard/modulosHorarios/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type Modulo = {
  id: number
  dia_semana: string
  hora_desde: number
  hora_hasta: number
  turnoId?: number | null
  activo: boolean
  createdAt?: string
  updatedAt?: string
}

type FormData = {
  dia_semana: string
  hora_desde: string
  hora_hasta: string
  turnoId: string
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

export default function ModuloHorarioDetallePage() {
  const { authHeaders } = useAuth()
  const params = useParams()
  const router = useRouter()

  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modulo, setModulo] = useState<Modulo | null>(null)

  const [form, setForm] = useState<FormData>({
    dia_semana: "",
    hora_desde: "",
    hora_hasta: "",
    turnoId: "",
  })

  async function cargar() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/modulosHorarios/${id}`, {
        headers: authHeaders,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "No se pudo cargar módulo")
        return
      }

      setModulo(data)

      setForm({
        dia_semana: data.dia_semana || "",
        hora_desde: String(data.hora_desde ?? ""),
        hora_hasta: String(data.hora_hasta ?? ""),
        turnoId: data.turnoId ? String(data.turnoId) : "",
      })
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

  async function guardar() {
    try {
      setGuardando(true)
      setError(null)

      const res = await fetch(`/api/modulosHorarios/${id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          dia_semana: form.dia_semana,
          hora_desde: Number(form.hora_desde),
          hora_hasta: Number(form.hora_hasta),
          turnoId: form.turnoId ? Number(form.turnoId) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "No se pudo actualizar")
        return
      }

      cargar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!confirm("¿Eliminar módulo?")) return

    const res = await fetch(`/api/modulosHorarios/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    })

    if (res.ok) {
      router.push("/protected/dashboard/modulosHorarios")
    } else {
      setError("No se pudo eliminar")
    }
  }

  if (loading) return <div>Cargando módulo...</div>

  if (!modulo) return <div>Módulo no encontrado</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <button
            onClick={() =>
              router.push("/protected/dashboard/modulosHorarios")
            }
          >
            ← Volver
          </button>

          <h1>Módulo #{modulo.id}</h1>

          <p>
            {modulo.dia_semana} | {modulo.hora_desde} - {modulo.hora_hasta}
          </p>
        </div>

        <button onClick={eliminar}>
          Eliminar
        </button>
      </div>

      {error && <div>{error}</div>}

      {/* Datos */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Editar módulo</h3>

        <div style={{ display: "grid", gap: 12 }}>
          <select
            value={form.dia_semana}
            onChange={(e) =>
              setForm({ ...form, dia_semana: e.target.value })
            }
          >
            {DIAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>

          <input
            value={form.hora_desde}
            onChange={(e) =>
              setForm({ ...form, hora_desde: e.target.value })
            }
            placeholder="Hora desde"
          />

          <input
            value={form.hora_hasta}
            onChange={(e) =>
              setForm({ ...form, hora_hasta: e.target.value })
            }
            placeholder="Hora hasta"
          />

          <input
            value={form.turnoId}
            onChange={(e) =>
              setForm({ ...form, turnoId: e.target.value })
            }
            placeholder="Turno ID"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={guardar}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Información */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Información</h3>

        <p>
          <strong>Estado:</strong>{" "}
          {modulo.activo ? "Activo" : "Inactivo"}
        </p>

        <p>
          <strong>Turno ID:</strong>{" "}
          {modulo.turnoId ?? "-"}
        </p>

        <p>
          <strong>Creado:</strong>{" "}
          {modulo.createdAt?.slice(0, 10) || "-"}
        </p>

        <p>
          <strong>Actualizado:</strong>{" "}
          {modulo.updatedAt?.slice(0, 10) || "-"}
        </p>
      </div>
    </div>
  )
}