//features/incidencias/hooks/useIncidencias.ts
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { fetchIncidencias, deleteIncidencia, reactivarIncidencia } from "../services/incidenciasService"
import type { Incidencia } from "../types"

export type VenceFiltro = "hoy" | "manana" | "resto-semana" | "7dias" | null

export function useIncidencias(soloHoyInicial: boolean = false, venceFiltroInicial: VenceFiltro = null) {
  const { authHeaders }               = useAuth()
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [busqueda,    setBusqueda]    = useState("")
  const [verEliminadas, setVerEliminadas] = useState(false)
  const [soloHoy,     setSoloHoy]     = useState(soloHoyInicial)
  const [venceFiltro, setVenceFiltro] = useState<VenceFiltro>(venceFiltroInicial)
  const incidenciasFiltradas = useMemo(() => {
    let resultado = incidencias
    if (soloHoy) {
      const hoyStr = new Date().toISOString().split("T")[0]
      resultado = resultado.filter(i =>
        i.fecha_desde.split("T")[0] <= hoyStr && hoyStr <= i.fecha_hasta.split("T")[0]
      )
    }
    if (venceFiltro) {
      // Mismos rangos que obtenerProximosVencimientos() en
      // app/api/dashboard/overview/route.ts -- UTC explícito, comparado
      // como string ISO (YYYY-MM-DD) para no depender de timezone local.
      const hoy = new Date()
      hoy.setUTCHours(0, 0, 0, 0)
      const manana = new Date(hoy)
      manana.setUTCDate(manana.getUTCDate() + 1)
      const semanaFin = new Date(hoy)
      semanaFin.setUTCDate(semanaFin.getUTCDate() + 7)
      const hoyStr       = hoy.toISOString().split("T")[0]
      const mananaStr    = manana.toISOString().split("T")[0]
      const semanaFinStr = semanaFin.toISOString().split("T")[0]
      resultado = resultado.filter(i => {
        const h = i.fecha_hasta.split("T")[0]
        switch (venceFiltro) {
          case "hoy":          return h === hoyStr
          case "manana":       return h === mananaStr
          // "vencen esta semana" en el backend excluye hoy y mañana (van
          // aparte) -- es el resto de la semana, día+2 a día+7.
          case "resto-semana": return h > mananaStr && h <= semanaFinStr
          // Aproximación de "reemplazos vencen esta semana": el backend
          // cuenta reemplazos activos, no incidencias -- acá se muestran
          // todas las incidencias que vencen en los próximos 7 días
          // (incluye hoy y mañana), que puede traer alguna sin reemplazo
          // asignado todavía.
          case "7dias":        return h >= hoyStr && h <= semanaFinStr
          default:              return true
        }
      })
    }
    if (!busqueda.trim()) return resultado
    const q = busqueda.toLowerCase()
      return resultado.filter(i =>
            i.asignacion?.identificadorEstructural.toLowerCase().includes(q) ||
            i.codigarioItem?.nombre.toLowerCase().includes(q) ||
            i.codigarioItem?.codigo.toLowerCase().includes(q) ||
            (i.agenteMostrado?.apellido.toLowerCase().includes(q) ?? false) ||
            (i.agenteMostrado?.nombre.toLowerCase().includes(q) ?? false)
          )
  }, [incidencias, busqueda, soloHoy, venceFiltro])
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
    soloHoy,
    setSoloHoy,
    venceFiltro,
    setVenceFiltro,
    eliminar,
    reactivar,
    clearError: () => setError(null),
  }
}