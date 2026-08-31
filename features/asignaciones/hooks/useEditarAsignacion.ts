// features/asignaciones/hooks/useEditarAsignacion.ts
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { asignacionesService } from "../services/asignacionesService"

export type EditarFormData = {
  unidadId:                 string
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string
  comisionId:               string
  cursoId:                  string
  materiaId:                string
  turnoId:                  string
}
type Unidad   = { id: number; nombre: string }
type Comision = { id: number; nombre: string; turno: { id: number }; unidad: { id: number } | null }
type Materia  = { id: number; nombre: string; cursoId: number | null }
type Turno    = { id: number; nombre: string }
export function useEditarAsignacion(rawId: string | string[]) {
  const id              = Array.isArray(rawId) ? rawId[0] : rawId
  const { authHeaders } = useAuth()
  const router          = useRouter()
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [restringido, setRestringido] = useState(false)
  const [form,        setForm]        = useState<EditarFormData | null>(null)
  const [unidades,   setUnidades]   = useState<Unidad[]>([])
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [materias,   setMaterias]   = useState<Materia[]>([])
  const [turnos,     setTurnos]     = useState<Turno[]>([])
  useEffect(() => {
    if (!id || authHeaders.Authorization === "Bearer ") return
    async function load() {
      try {
        const [resA, resU, resC, resM, resT, tieneHistorial] = await Promise.all([
          fetch(`/api/asignaciones/${id}`, { headers: authHeaders }),
          fetch("/api/unidades",           { headers: authHeaders }),
          fetch("/api/comisiones",         { headers: authHeaders }),
          fetch("/api/materias",           { headers: authHeaders }),
          fetch("/api/turnos",             { headers: authHeaders }),
          // UX-ASG-007: misma fuente de verdad que usa el backend para
          // bloquear la edición (tieneEntidadesRelacionadas), en vez del
          // criterio propio anterior que usaba "titularidades" como proxy.
          asignacionesService.tieneHistorial(Number(id), authHeaders),
        ])
        const data = await resA.json()
        if (data.error) { setError(data.error); return }
        setForm({
          unidadId:                 String(data.unidad?.id ?? ""),
          identificadorEstructural: data.identificadorEstructural,
          fecha_inicio:             data.fecha_inicio.split("T")[0],
          fecha_fin:                data.fecha_fin?.split("T")[0] ?? "",
          comisionId:               String(data.comision?.id ?? ""),
          cursoId:                  String(data.comision?.curso?.id ?? ""),
          materiaId:                String(data.materia?.id ?? ""),
          turnoId:                  String(data.turno?.id ?? ""),
        })
        setRestringido(tieneHistorial)
        const [u, c, m, t] = await Promise.all([
          resU.json().catch(() => []),
          resC.json().catch(() => []),
          resM.json().catch(() => []),
          resT.json().catch(() => []),
        ])
        setUnidades(Array.isArray(u)   ? u : [])
        setComisiones(Array.isArray(c) ? c : [])
        setMaterias(Array.isArray(m)   ? m : [])
        setTurnos(Array.isArray(t)     ? t : [])
      } catch {
        setError("Error cargando asignación")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, authHeaders.Authorization])
  const materiasFiltradas = useMemo(() => {
    if (!form?.cursoId) return []
    return materias.filter(m => m.cursoId === Number(form.cursoId))
  }, [materias, form?.cursoId])
  function setField(key: keyof EditarFormData, value: string) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
  }
  async function guardar() {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      const body = restringido
        ? { fecha_fin: form.fecha_fin || null }
        : {
            unidadId:                 Number(form.unidadId),
            identificadorEstructural: form.identificadorEstructural,
            fecha_inicio:             form.fecha_inicio,
            fecha_fin:                form.fecha_fin || null,
            comisionId:               form.comisionId ? Number(form.comisionId) : null,
            materiaId:                form.materiaId  ? Number(form.materiaId)  : null,
            turnoId:                  form.turnoId    ? Number(form.turnoId)    : null,
          }
      const res = await fetch(`/api/asignaciones/${id}`, {
        method:  "PATCH",
        headers: authHeaders,
        body:    JSON.stringify(body),
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
  return {
    loading,
    saving,
    error,
    setError,
    restringido,
    form,
    unidades,
    comisiones,
    materias,
    turnos,
    materiasFiltradas,
    setField,
    guardar,
  }
}