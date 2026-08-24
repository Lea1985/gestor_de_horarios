//features/incidencias/hooks/useIncidenciaDetalle.ts
import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { fetchIncidenciaDetalle, fetchCadena, fetchCobertura, deleteIncidencia, reactivarIncidencia } from "../services/incidenciasService"
import type { IncidenciaDetalle, CadenaItem, TramoCobertura } from "../types"

export function useIncidenciaDetalle(id: string) {
  const { authHeaders } = useAuth()
  const [incidencia, setIncidencia] = useState<IncidenciaDetalle | null>(null)
  const [cadena,     setCadena]     = useState<CadenaItem[]>([])
  const [cobertura,  setCobertura]  = useState<TramoCobertura[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [confirmar,  setConfirmar]  = useState(false)
  const [confirmarReactivar, setConfirmarReactivar] = useState(false)

  async function cargar() {
    try {
      setLoading(true)
      setError(null)
      const [inc, cad] = await Promise.all([
        fetchIncidenciaDetalle(id, authHeaders),
        fetchCadena(id, authHeaders),
      ])
      setIncidencia(inc)
      setCadena(cad)
      const cob = await fetchCobertura(id, authHeaders)
      setCobertura(cob)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization])

  async function eliminar(): Promise<boolean> {
    try {
      await deleteIncidencia(Number(id), authHeaders)
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error de red")
      return false
    } finally {
      setConfirmar(false)
    }
  }

  async function reactivar(): Promise<boolean> {
    try {
      await reactivarIncidencia(Number(id), authHeaders)
      await cargar()
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error de red")
      return false
    } finally {
      setConfirmarReactivar(false)
    }
  }

  return {
    incidencia,
    cadena,
    cobertura,
    loading,
    error,
    setError,
    confirmar,
    setConfirmar,
    eliminar,
    confirmarReactivar,
    setConfirmarReactivar,
    reactivar,
    // Recarga completa (incidencia + cadena + cobertura). Se expone para
    // que otros hooks de la misma página (ej. useClasesAfectadas, al
    // agregar/quitar un reemplazo) puedan pedirle a este hook que se
    // refresque -- si no, la "Cadena de incidencias" queda con el
    // primer fetch para siempre, porque vive en un hook separado que
    // nunca se entera del cambio (bug encontrado 24/08/2026).
    recargar: cargar,
  }
}