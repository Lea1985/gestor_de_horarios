//features/incidencias/components/useIncidenciaDetalle.ts
import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { fetchIncidenciaDetalle, fetchCadena, deleteIncidencia, reactivarIncidencia } from "../services/incidenciasService"
import type { IncidenciaDetalle, CadenaItem } from "../types"

export function useIncidenciaDetalle(id: string) {
  const { authHeaders } = useAuth()

  const [incidencia, setIncidencia] = useState<IncidenciaDetalle | null>(null)
  const [cadena,     setCadena]     = useState<CadenaItem[]>([])
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
    loading,
    error,
    setError,
    confirmar,
    setConfirmar,
    eliminar,
    confirmarReactivar,
    setConfirmarReactivar,
    reactivar,
  }
}