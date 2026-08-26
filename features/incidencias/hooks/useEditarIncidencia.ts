//features/incidencias/hooks/useEditarIncidencia.ts
import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { fetchItemsCodigario, fetchCodigarios } from "../services/incidenciasService"
import type { Codigario, CodigarioItem } from "../types"

export type FormData = {
  codigarioId:     string
  codigarioItemId: string
  fecha_desde:     string
  fecha_hasta:     string
  observacion:     string
}

export function useEditarIncidencia(id: string) {
  const { authHeaders } = useAuth()
  const [loading,        setLoading]        = useState(true)
  const [guardando,      setGuardando]      = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [codigarios,     setCodigarios]     = useState<Codigario[]>([])
  const [items,          setItems]          = useState<CodigarioItem[]>([])
  const [loadingItems,   setLoadingItems]   = useState(false)
  // Si tiene un reemplazo activo, la incidencia NO se puede editar en
  // absoluto (misma regla que ya bloquea el botón "Editar" en el
  // detalle) -- esta pantalla solo se alcanza saltando ese botón por
  // URL directa. Antes existía acá un "modo restringido" (solo fecha de
  // cierre editable) que nunca funcionó: el backend (actualizarIncidencia,
  // Regla 2) rechaza CUALQUIER cambio si hay reemplazos activos, sin
  // excepción -- confirmado en vivo el 25/08/2026 (UX-INC-001). Se quita
  // esa lógica y se bloquea directamente, en vez de mostrar un
  // formulario que promete algo que el backend no permite.
  const [tieneReemplazo, setTieneReemplazo] = useState(false)
  const [formErrors,     setFormErrors]     = useState<Partial<FormData>>({})
  const [form, setForm] = useState<FormData>({
    codigarioId: "", codigarioItemId: "",
    fecha_desde: "", fecha_hasta: "", observacion: "",
  })
  // ── Carga inicial ────────────────────────────────────────────
  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    async function cargar() {
      try {
        const [r1, catalogos] = await Promise.all([
          fetch(`/api/incidencias/${id}`, { headers: authHeaders }).then(r => r.json()),
          fetchCodigarios(authHeaders),
        ])
        setCodigarios(catalogos)
        const conReemplazo =
          Array.isArray(r1.ClaseProgramada) &&
          r1.ClaseProgramada.some(
            (c: { reemplazos?: unknown[] }) => (c.reemplazos?.length ?? 0) > 0
          )
        setTieneReemplazo(conReemplazo)
        setForm({
          codigarioId:     r1.codigarioItem?.codigarioId?.toString() ?? "",
          codigarioItemId: r1.codigarioItemId?.toString() ?? "",
          fecha_desde:     r1.fecha_desde.slice(0, 10),
          fecha_hasta:     r1.fecha_hasta.slice(0, 10),
          observacion:     r1.observacion ?? "",
        })
      } catch {
        setError("Error cargando incidencia")
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [authHeaders.Authorization])
  // ── Items cuando cambia codigario ────────────────────────────
  useEffect(() => {
    if (!form.codigarioId) { setItems([]); return }
    setLoadingItems(true)
    fetchItemsCodigario(form.codigarioId, authHeaders)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false))
  }, [form.codigarioId])
  // ── Helpers ──────────────────────────────────────────────────
  function campo<K extends keyof FormData>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }))
    setFormErrors(p => ({ ...p, [key]: undefined }))
  }
  function validar(): boolean {
    const err: Partial<FormData> = {}
    if (!form.codigarioId)     err.codigarioId     = "Requerido"
    if (!form.codigarioItemId) err.codigarioItemId = "Requerido"
    if (!form.fecha_desde)     err.fecha_desde     = "Requerido"
    if (!form.fecha_hasta)     err.fecha_hasta     = "Requerido"
    setFormErrors(err)
    return Object.keys(err).length === 0
  }
  // ── Guardar ──────────────────────────────────────────────────
  async function guardar(): Promise<boolean> {
    if (!validar()) return false
    setGuardando(true)
    setError(null)
    try {
      const body = {
        codigarioItemId: Number(form.codigarioItemId),
        fecha_desde:     form.fecha_desde,
        fecha_hasta:     form.fecha_hasta,
        observacion:     form.observacion || null,
      }
      const res = await fetch(`/api/incidencias/${id}`, {
        method:  "PATCH",
        headers: authHeaders,
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error actualizando"); return false }
      return true
    } catch {
      setError("Error de red")
      return false
    } finally {
      setGuardando(false)
    }
  }
  return {
    loading, guardando, error, setError,
    codigarios, items, loadingItems,
    tieneReemplazo,
    form, setForm,
    formErrors,
    campo, guardar,
  }
}