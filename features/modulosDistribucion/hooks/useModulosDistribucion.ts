// features/modulosDistribucion/hooks/useModulosDistribucion.ts

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { modulosDistribucionService } from "../services/modulosDistribucionService"
import type { Modulo, Distribucion, IncidenciaAfectada } from "../types"
import { ORDEN_DIAS } from "../types"

export function useModulosDistribucion(distribuidonId: string) {
  const { authHeaders } = useAuth()
  const router          = useRouter()

  // ── datos ──────────────────────────────────────────────────────────────────
  const [dist,          setDist]          = useState<Distribucion | null>(null)
  const [modulos,       setModulos]       = useState<Modulo[]>([])
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [seleccionadosOriginal, setSeleccionadosOriginal] = useState<number[]>([])

  // ── ui ─────────────────────────────────────────────────────────────────────
  const [loading,        setLoading]        = useState(true)
  const [guardando,      setGuardando]      = useState(false)
  const [guardado,       setGuardado]       = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [modalVersion,   setModalVersion]   = useState(false)
  const [creandoVersion, setCreandoVersion] = useState(false)
  const [editando,       setEditando]       = useState(false)

  // ── migración de reemplazos ───────────────────────────────────────────────
  const [incidenciasAfectadas, setIncidenciasAfectadas] = useState<IncidenciaAfectada[] | null>(null)

  // ── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!distribuidonId || authHeaders.Authorization === "Bearer ") return
    async function cargar() {
      try {
        const [modulosData, distData] = await Promise.all([
          modulosDistribucionService.listarModulos(authHeaders),
          modulosDistribucionService.obtenerDistribucion(distribuidonId, authHeaders),
        ])
        setModulos(modulosData)
        setDist(distData)
        const ids = (distData.distribucionModulos ?? []).map(x => x.moduloHorarioId)
        setSeleccionados(ids)
        setSeleccionadosOriginal(ids)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos")
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [distribuidonId, authHeaders.Authorization])

  // ── derivados ──────────────────────────────────────────────────────────────
  const agrupados = useMemo(() => {
    const grupos = new Map<string, Modulo[]>()
    for (const dia of ORDEN_DIAS) grupos.set(dia, [])
    for (const m of modulos) grupos.get(m.dia_semana)?.push(m)
    for (const lista of grupos.values()) lista.sort((a, b) => a.hora_desde - b.hora_desde)
    return grupos
  }, [modulos])

  const esActivo           = dist?.estado === "ACTIVO"
  const tieneModulos       = (dist?.distribucionModulos.length ?? 0) > 0
  const checkboxHabilitado = esActivo && (editando || !tieneModulos)
  const totalSeleccionados = seleccionados.length
  const agente             = dist?.asignacion.titularidades?.[0]?.agente

  // ── acciones ───────────────────────────────────────────────────────────────
  function toggle(moduloId: number) {
    if (!checkboxHabilitado) return
    setSeleccionados(prev =>
      prev.includes(moduloId) ? prev.filter(x => x !== moduloId) : [...prev, moduloId]
    )
    setGuardado(false)
  }

  function toggleDia(dia: string) {
    if (!checkboxHabilitado) return
    const lista = agrupados.get(dia) ?? []
    const ids   = lista.map(m => m.id)
    const todosSeleccionados = ids.every(id => seleccionados.includes(id))
    setSeleccionados(prev =>
      todosSeleccionados ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    )
    setGuardado(false)
  }

  function cancelarEdicion() {
    setSeleccionados(seleccionadosOriginal)
    setEditando(false)
    setGuardado(false)
  }

  async function guardar(migrarIncidenciaIds?: number[]) {
    setGuardando(true)
    setError(null)
    setGuardado(false)
    try {
      const data = await modulosDistribucionService.guardarModulos(
        distribuidonId, seleccionados, authHeaders, migrarIncidenciaIds
      )

      if (data.requiereConfirmacion) {
        setIncidenciasAfectadas(data.incidenciasAfectadas ?? [])
        return // esperamos que el usuario decida en el modal
      }

      setIncidenciasAfectadas(null)
      setGuardado(true)
      setEditando(false)
      setSeleccionadosOriginal(seleccionados)
      setDist(prev => prev
        ? { ...prev, distribucionModulos: seleccionados.map(id => ({ moduloHorarioId: id })) }
        : prev
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setGuardando(false)
    }
  }

  function cancelarMigracion() {
    setIncidenciasAfectadas(null)
  }

  async function crearNuevaVersion() {
    setCreandoVersion(true)
    setError(null)
    try {
      const data = await modulosDistribucionService.crearNuevaVersion(distribuidonId, authHeaders)
      router.push(`/protected/dashboard/distribuciones/${data.nuevaVersionId}/modulos`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setCreandoVersion(false)
      setModalVersion(false)
    }
  }

  // ── return ─────────────────────────────────────────────────────────────────
  return {
    // datos
    dist,
    modulos,
    seleccionados,
    agrupados,
    agente,

    // flags
    loading,
    guardando,
    guardado,
    error,
    setError,
    esActivo,
    tieneModulos,
    checkboxHabilitado,
    totalSeleccionados,

    // ui
    editando,
    setEditando,
    modalVersion,
    setModalVersion,
    creandoVersion,

    // migración de reemplazos
    incidenciasAfectadas,
    cancelarMigracion,

    // acciones
    toggle,
    toggleDia,
    cancelarEdicion,
    guardar,
    crearNuevaVersion,
  }
}