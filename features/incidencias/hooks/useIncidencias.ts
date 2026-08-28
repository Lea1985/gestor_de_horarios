//features/incidencias/hooks/useIncidencias.ts
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { fetchIncidencias, deleteIncidencia, reactivarIncidencia, fetchPeriodos } from "../services/incidenciasService"
import type { Incidencia, PeriodoOperativo } from "../types"

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

  // UX-101: separar incidencias del período operativo activo de las
  // históricas. periodoSeleccionadoId === null significa "período
  // activo" (default); un id puntual significa que se eligió ver un
  // período cerrado. tramoDesde/tramoHasta acotan más ese período.
  const [periodos,               setPeriodos]                 = useState<PeriodoOperativo[]>([])
  const [periodoSeleccionadoId,  setPeriodoSeleccionadoIdState] = useState<number | null>(null)
  const [tramoDesde,             setTramoDesde]               = useState("")
  const [tramoHasta,             setTramoHasta]               = useState("")

  function setPeriodoSeleccionadoId(id: number | null) {
    setPeriodoSeleccionadoIdState(id)
    setTramoDesde("")
    setTramoHasta("")
  }

  const periodoActivo = useMemo(
    () => periodos.find(p => p.estado === "ACTIVO") ?? null,
    [periodos]
  )
  const periodosHistoricos = useMemo(
    () => periodos.filter(p => p.estado !== "ACTIVO"),
    [periodos]
  )
  // Período efectivamente usado para filtrar: el elegido a mano, o si no
  // se eligió ninguno, el activo (si existe -- si no hay ninguno activo
  // no se filtra por período, se ven todas las incidencias).
  const periodoFiltro = periodoSeleccionadoId === null
    ? periodoActivo
    : periodos.find(p => p.id === periodoSeleccionadoId) ?? null

  const incidenciasFiltradas = useMemo(() => {
    let resultado = incidencias

    if (periodoFiltro) {
      const pDesde = periodoFiltro.fecha_desde.slice(0, 10)
      const pHasta = periodoFiltro.fecha_hasta.slice(0, 10)
      resultado = resultado.filter(i => {
        const iDesde = i.fecha_desde.slice(0, 10)
        const iHasta = i.fecha_hasta.slice(0, 10)
        return iDesde <= pHasta && iHasta >= pDesde
      })
      // Tramo opcional dentro de un período histórico elegido a mano.
      if (periodoSeleccionadoId !== null && tramoDesde && tramoHasta) {
        resultado = resultado.filter(i => {
          const iDesde = i.fecha_desde.slice(0, 10)
          const iHasta = i.fecha_hasta.slice(0, 10)
          return iDesde <= tramoHasta && iHasta >= tramoDesde
        })
      }
    }

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

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      resultado = resultado.filter(i =>
        i.asignacion?.identificadorEstructural.toLowerCase().includes(q) ||
        i.codigarioItem?.nombre.toLowerCase().includes(q) ||
        i.codigarioItem?.codigo.toLowerCase().includes(q) ||
        (i.agenteMostrado?.apellido.toLowerCase().includes(q) ?? false) ||
        (i.agenteMostrado?.nombre.toLowerCase().includes(q) ?? false)
      )
    }

    // UX-101: orden estable por id, ascendente.
    return [...resultado].sort((a, b) => a.id - b.id)
  }, [incidencias, busqueda, soloHoy, venceFiltro, periodoFiltro, periodoSeleccionadoId, tramoDesde, tramoHasta])

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

  async function cargarPeriodos() {
    try {
      setPeriodos(await fetchPeriodos(authHeaders))
    } catch {
      // No crítico: si falla, no se puede filtrar por período y se ven
      // todas las incidencias -- mismo comportamiento que "sin período
      // activo".
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      cargar()
      cargarPeriodos()
    }
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
    // UX-101
    periodoActivo,
    periodosHistoricos,
    periodoSeleccionadoId,
    setPeriodoSeleccionadoId,
    tramoDesde,
    setTramoDesde,
    tramoHasta,
    setTramoHasta,
  }
}