// features/asignaciones/hooks/useAsignacionDetalle.ts
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { asignacionesService } from "../services/asignacionesService"
import type { Agente, TitularHistorial } from "../types"

type TitularVigente = {
  id: number
  agente: {
    id:        number
    nombre:    string
    apellido:  string
    documento: string
    email?:    string
    telefono?: string
  }
}
export type AsignacionDetalle = {
  id:                       number
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string | null
  estado:                   string
  activo:                   boolean
  deletedAt:                string | null
  titularidades:            TitularVigente[]
  unidad:   { id: number; nombre: string; codigoUnidad: number; tipo?: string }
  materia:  { id: number; nombre: string } | null
  comision: { id: number; nombre: string } | null
  turno:    { id: number; nombre: string } | null
  distribuciones?: {
    id:                   number
    version:              number
    estado:               string
    fecha_vigencia_desde: string
    fecha_vigencia_hasta: string | null
  }[]
  incidencias?: {
    id:          number
    fecha_desde: string
    fecha_hasta: string
    activo:      boolean
    codigarioItem?: { codigo: string; nombre: string }
  }[]
}

function hoyISO() {
  const d  = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().split("T")[0]
}

function formatFechaDDMMYYYY(iso: string) {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export function useAsignacionDetalle(id: string) {
  const { authHeaders } = useAuth()
  const router          = useRouter()
  const [asignacion,          setAsignacion]          = useState<AsignacionDetalle | null>(null)
  const [loading,             setLoading]             = useState(true)
  const [error,               setError]               = useState<string | null>(null)
  const [confirmar,           setConfirmar]           = useState(false)
  const [confirmarReactivar,  setConfirmarReactivar]  = useState(false)
  const [mostrarCambioTitular, setMostrarCambioTitular] = useState(false)
  const [confirmarCambioTitular, setConfirmarCambioTitular] = useState(false)
  const [agentes,             setAgentes]             = useState<Agente[]>([])
  const [agenteId,            setAgenteId]            = useState("")
  const [fechaDesde,          setFechaDesde]          = useState("")
  const [guardando,           setGuardando]           = useState(false)
  const [historialTitulares,  setHistorialTitulares]  = useState<TitularHistorial[]>([])
  const [tieneHistorial,      setTieneHistorial]      = useState(false)

  async function cargar() {
    setLoading(true)
    setError(null)
    try {
      const r    = await fetch(`/api/asignaciones/${id}`, { headers: authHeaders })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? "Error cargando asignación")
        return
      }
      setAsignacion(data)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }

  async function cargarHistorial() {
    try {
      const data = await asignacionesService.listarTitulares(Number(id), authHeaders)
      setHistorialTitulares(data)
    } catch {
      // Silencioso: si falla el historial no bloqueamos la pantalla principal.
    }
  }

  // UX-ASG-007: "tiene historial" ahora viene siempre de la misma fuente de
  // verdad que usa el backend para bloquear la edición (tieneEntidadesRelacionadas,
  // vía el endpoint ?historial=true), en vez de recalcularse acá con un
  // criterio propio que no consideraba ClaseProgramada.
  async function cargarTieneHistorial() {
    try {
      const data = await asignacionesService.tieneHistorial(Number(id), authHeaders)
      setTieneHistorial(data)
    } catch {
      // Silencioso: ante una falla de red, no bloqueamos la pantalla; el
      // backend igual va a rechazar una edición estructural si corresponde.
    }
  }

  useEffect(() => {
    if (!id) return
    const token = authHeaders.Authorization
    if (!token || token === "Bearer ") return
    cargar()
    cargarHistorial()
    cargarTieneHistorial()
  }, [id, authHeaders.Authorization])

  async function eliminar() {
    try {
      const res = await fetch(`/api/asignaciones/${id}`, {
        method:  "DELETE",
        headers: authHeaders,
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Error eliminando")
        setConfirmar(false)
        return
      }
      router.push("/protected/dashboard/asignaciones")
    } catch {
      setError("Error de red")
    } finally {
      setConfirmar(false)
    }
  }

  async function reactivar() {
    try {
      const res = await fetch(`/api/asignaciones/${id}/reactivar`, {
        method:  "POST",
        headers: authHeaders,
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Error reactivando")
        return
      }
      await cargar()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarReactivar(false)
    }
  }

  async function abrirCambiarTitular() {
    setError(null)
    try {
      const combos = await asignacionesService.listarCombos(authHeaders)
      setAgentes(combos.agentes)
    } catch {
      setError("Error cargando agentes")
      return
    }
    const titularActual = asignacion?.titularidades[0]?.agente
    setAgenteId(titularActual ? String(titularActual.id) : "")
    setFechaDesde(hoyISO())
    setMostrarCambioTitular(true)
  }

  function cancelarCambioTitular() {
    setMostrarCambioTitular(false)
    setConfirmarCambioTitular(false)
    setAgenteId("")
    setFechaDesde("")
    setError(null)
  }

  function pedirConfirmarCambioTitular() {
    if (!agenteId || !fechaDesde) return
    const titularActual = asignacion?.titularidades[0]?.agente
    if (titularActual && Number(agenteId) === titularActual.id) {
      setError("Ese agente ya es el titular actual. Elegí otro agente o cancelá.")
      return
    }
    setError(null)
    setConfirmarCambioTitular(true)
  }

  function cancelarConfirmarCambioTitular() {
    setConfirmarCambioTitular(false)
  }

  async function guardarCambioTitular() {
    if (!agenteId || !fechaDesde) return
    setConfirmarCambioTitular(false)
    setGuardando(true)
    setError(null)
    try {
      await asignacionesService.cambiarTitular(Number(id), Number(agenteId), fechaDesde, authHeaders)
      setMostrarCambioTitular(false)
      setAgenteId("")
      setFechaDesde("")
      await cargar()
      await cargarHistorial()
      await cargarTieneHistorial()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setGuardando(false)
    }
  }

  const titular = asignacion?.titularidades[0]?.agente ?? null
  const contexto = [
    asignacion?.turno?.nombre,
    asignacion?.comision?.nombre,
    asignacion?.materia?.nombre,
  ].filter(Boolean) as string[]
  const tieneIncidenciasActivas = (asignacion?.incidencias ?? []).some(i => i.activo)
  const motivoBloqueoEliminar   = tieneIncidenciasActivas ? "Tiene incidencias activas" : null
  const puedeEliminar           = motivoBloqueoEliminar === null
  const motivoBloqueoEditar = tieneHistorial
    ? "Edición estructural bloqueada · tiene historial"
    : null
  const esEliminada = !!asignacion?.deletedAt

  const agenteSeleccionado = agentes.find(a => a.id === Number(agenteId))
  const mensajeConfirmarCambioTitular = agenteSeleccionado
    ? `¿Cambiar el titular de "${asignacion?.identificadorEstructural}" a ${agenteSeleccionado.apellido}, ${agenteSeleccionado.nombre} a partir del ${formatFechaDDMMYYYY(fechaDesde)}? La titularidad actual queda cerrada el día anterior.`
    : ""

  return {
    asignacion,
    loading,
    error,
    setError,
    confirmar,
    setConfirmar,
    titular,
    contexto,
    eliminar,
    puedeEliminar,
    motivoBloqueoEliminar,
    tieneHistorial,
    motivoBloqueoEditar,
    mostrarCambioTitular,
    confirmarCambioTitular,
    mensajeConfirmarCambioTitular,
    agentes,
    agenteId,
    setAgenteId,
    fechaDesde,
    setFechaDesde,
    guardando,
    abrirCambiarTitular,
    cancelarCambioTitular,
    pedirConfirmarCambioTitular,
    cancelarConfirmarCambioTitular,
    guardarCambioTitular,
    esEliminada,
    confirmarReactivar,
    setConfirmarReactivar,
    reactivar,
    historialTitulares,
  }
}