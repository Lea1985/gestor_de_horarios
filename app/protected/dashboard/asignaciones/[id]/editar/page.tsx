
// ─────────────────────────────────────────────────────────────────────────────
// app/protected/dashboard/asignaciones/[id]/editar/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type Unidad   = { id: number; nombre: string }
type Comision = { id: number; nombre: string; turno: { id: number }; unidad: { id: number } | null }
type Materia  = { id: number; nombre: string; cursoId: number | null }
type Turno    = { id: number; nombre: string }

type FormData = {
  unidadId: string
  identificadorEstructural: string
  fecha_inicio: string
  fecha_fin: string
  comisionId: string
  cursoId: string
  materiaId: string
  turnoId: string
}

export default function EditarAsignacionPage() {
  const { id } = useParams()
  const router = useRouter()
  const { authHeaders } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restringido, setRestringido] = useState(false)

  const [form, setForm] = useState<FormData | null>(null)

  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [resA, resU, resC, resM, resT] = await Promise.all([
          fetch(`/api/asignaciones/${id}`, { headers: authHeaders }),
          fetch("/api/unidades", { headers: authHeaders }),
          fetch("/api/comisiones", { headers: authHeaders }),
          fetch("/api/materias", { headers: authHeaders }),
          fetch("/api/turnos", { headers: authHeaders }),
        ])

        const data = await resA.json()

        if (data.error) {
          setError(data.error)
          return
        }

        setForm({
          unidadId: String(data.unidad?.id ?? ""),
          identificadorEstructural: data.identificadorEstructural,
          fecha_inicio: data.fecha_inicio.split("T")[0],
          fecha_fin: data.fecha_fin?.split("T")[0] ?? "",
          comisionId: String(data.comision?.id ?? ""),
          cursoId: String(data.comision?.curso?.id ?? ""),
          materiaId: String(data.materia?.id ?? ""),
          turnoId: String(data.turno?.id ?? ""),
        })

        // Detectar si la asignación tiene historial para mostrar aviso
        const tieneHistorial =
          (data.distribuciones?.length ?? 0) > 0 ||
          (data.incidencias?.length ?? 0) > 0 ||
          (data.titularidades?.length ?? 0) > 0

        setRestringido(tieneHistorial)

        const [u, c, m, t] = await Promise.all([
          resU.json().catch(() => []),
          resC.json().catch(() => []),
          resM.json().catch(() => []),
          resT.json().catch(() => []),
        ])

        setUnidades(Array.isArray(u) ? u : [])
        setComisiones(Array.isArray(c) ? c : [])
        setMaterias(Array.isArray(m) ? m : [])
        setTurnos(Array.isArray(t) ? t : [])
      } catch {
        setError("Error cargando asignación")
      } finally {
        setLoading(false)
      }
    }

    if (authHeaders.Authorization !== "Bearer ") {
      load()
    }
  }, [id, authHeaders.Authorization])

  function setField(key: keyof FormData, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  const materiasFiltradas = useMemo(() => {
    if (!form?.cursoId) return []
    return materias.filter((m) => m.cursoId === Number(form.cursoId))
  }, [materias, form?.cursoId])

  async function guardar() {
    if (!form) return

    setSaving(true)
    setError(null)

    // Solo enviar campos permitidos cuando hay historial.
    // Los campos estructurales serán rechazados por el use case con 409,
    // pero lo prevenimos también en UI para mejor UX.
    const body = restringido
      ? {
          fecha_fin: form.fecha_fin || null,
          // estado podría agregarse acá si hubiera selector en el form
        }
      : {
          unidadId: Number(form.unidadId),
          identificadorEstructural: form.identificadorEstructural,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
          comisionId: form.comisionId ? Number(form.comisionId) : null,
          materiaId: form.materiaId ? Number(form.materiaId) : null,
          turnoId: form.turnoId ? Number(form.turnoId) : null,
        }

    try {
      const res = await fetch(`/api/asignaciones/${id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Error guardando")
        return
      }

      router.push(`/protected/dashboard/asignaciones/${id}`)
    } catch {
      setError("Error de red")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) return <div>Cargando...</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
      <button
        onClick={() => router.back()}
        style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "var(--text-xs)", padding: 0 }}
      >
        ← Volver
      </button>

      <h1>Editar asignación</h1>

      {restringido && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-warning-bg, #fefce8)", border: "1px solid var(--color-warning, #ca8a04)", fontSize: "var(--text-xs)", color: "var(--color-warning-text, #854d0e)" }}>
          Esta asignación tiene historial. Solo se puede modificar la fecha de cese.
          Para cambiar el titular, usá la opción "Cambio titular" desde la lista.
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
          {error}
        </div>
      )}

      {/* Campos estructurales — solo editables sin historial */}
      {!restringido && (
        <>
          <select value={form.unidadId} onChange={e => setField("unidadId", e.target.value)}>
            <option value="">Unidad</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>

          <input
            placeholder="Identificador"
            value={form.identificadorEstructural}
            onChange={e => setField("identificadorEstructural", e.target.value)}
          />

          <input
            type="date"
            value={form.fecha_inicio}
            onChange={e => setField("fecha_inicio", e.target.value)}
          />

          <select value={form.comisionId} onChange={e => setField("comisionId", e.target.value)}>
            <option value="">Comisión</option>
            {comisiones.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <select value={form.materiaId} onChange={e => setField("materiaId", e.target.value)}>
            <option value="">Materia</option>
            {materiasFiltradas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>

          <select value={form.turnoId} onChange={e => setField("turnoId", e.target.value)}>
            <option value="">Turno</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </>
      )}

      {/* Fecha fin siempre editable */}
      <label style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
        Fecha de cese
        <input
          type="date"
          value={form.fecha_fin}
          onChange={e => setField("fecha_fin", e.target.value)}
          style={{ display: "block", marginTop: 4 }}
        />
      </label>

      <div>
        <button onClick={() => router.back()}>Cancelar</button>
        <button onClick={guardar} disabled={saving} style={{ marginLeft: 8 }}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  )
}
