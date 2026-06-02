// features/asignaciones/hooks/useAsignacionDetalle.ts

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { asignacionesService } from "../services/asignacionesService"
import type { Agente } from "../types"

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

export function useAsignacionDetalle(id: string) {
  const { authHeaders } = useAuth()
  const router          = useRouter()

  const [asignacion,          setAsignacion]          = useState<AsignacionDetalle | null>(null)
  const [loading,             setLoading]             = useState(true)
  const [error,               setError]               = useState<string | null>(null)
  const [confirmar,           setConfirmar]           = useState(false)
  const [mostrarCambioTitular, setMostrarCambioTitular] = useState(false)
  const [agentes,             setAgentes]             = useState<Agente[]>([])
  const [agenteId,            setAgenteId]            = useState("")
  const [guardando,           setGuardando]           = useState(false)

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

  useEffect(() => {
    if (!id) return
    const token = authHeaders.Authorization
    if (!token || token === "Bearer ") return
    cargar()
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
    setMostrarCambioTitular(true)
  }

  function cancelarCambioTitular() {
    setMostrarCambioTitular(false)
    setAgenteId("")
    setError(null)
  }

  async function guardarCambioTitular() {
    if (!agenteId) return
    setGuardando(true)
    setError(null)
    try {
      await asignacionesService.cambiarTitular(Number(id), Number(agenteId), authHeaders)
      setMostrarCambioTitular(false)
      setAgenteId("")
      await cargar()
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

  const tieneHistorial = (
    (asignacion?.distribuciones?.length ?? 0) > 0 ||
    (asignacion?.incidencias?.length ?? 0) > 0
  )
  const motivoBloqueoEditar = tieneHistorial
    ? "Edición estructural bloqueada · tiene historial"
    : null

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
    agentes,
    agenteId,
    setAgenteId,
    guardando,
    abrirCambiarTitular,
    cancelarCambioTitular,
    guardarCambioTitular,
  }
}