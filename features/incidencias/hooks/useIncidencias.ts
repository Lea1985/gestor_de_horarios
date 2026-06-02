//features/incidencias/hooks/useIncidencias.ts
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { fetchIncidencias, deleteIncidencia, reactivarIncidencia } from "../services/incidenciasService"
import type { Incidencia } from "../types"

export function useIncidencias() {
  const { authHeaders }               = useAuth()
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [busqueda,    setBusqueda]    = useState("")
  const [verEliminadas, setVerEliminadas] = useState(false)

  const incidenciasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return incidencias
    const q = busqueda.toLowerCase()
    return incidencias.filter(i =>
      i.asignacion?.identificadorEstructural.toLowerCase().includes(q) ||
      i.codigarioItem?.nombre.toLowerCase().includes(q) ||
      i.codigarioItem?.codigo.toLowerCase().includes(q) ||
      (i.asignacion?.titularidades[0]?.agente?.apellido.toLowerCase().includes(q) ?? false) ||
      (i.asignacion?.titularidades[0]?.agente?.nombre.toLowerCase().includes(q) ?? false)
    )
  }, [incidencias, busqueda])

  async function cargar() {
    try {
      setLoading(true)
      setError(null)
      setIncidencias(await fetchIncidencias(authHeaders, verEliminadas))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando incidencias")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization, verEliminadas])

  async function eliminar(id: number) {
    try {
      await deleteIncidencia(id, authHeaders)
      if (verEliminadas) {
        setIncidencias(prev => prev.map(i =>
          i.id === id ? { ...i, activo: false, deletedAt: new Date().toISOString() } : i
        ))
      } else {
        setIncidencias(prev => prev.filter(i => i.id !== id))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error de red")
    }
  }

  async function reactivar(id: number) {
    try {
      await reactivarIncidencia(id, authHeaders)
      setIncidencias(prev => prev.map(i =>
        i.id === id ? { ...i, activo: true, deletedAt: null } : i
      ))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error de red")
    }
  }

  return {
    incidenciasFiltradas,
    loading,
    error,
    busqueda,
    setBusqueda,
    verEliminadas,
    setVerEliminadas,
    eliminar,
    reactivar,
    clearError: () => setError(null),
  }
}