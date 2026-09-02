// features/distribuciones/hooks/useDistribuciones.ts
// Hook principal de la feature Distribuciones.
// Absorbe estado, useMemo y handlers desde page.tsx — paso 3.
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { distribucionesService } from "../services/distribucionesService"
import type { Distribucion, Asignacion, DistribucionFormData, TramoReemplazo } from "../types"
import { FORM_VACIO } from "../types"
export function useDistribuciones() {
  const { authHeaders } = useAuth()
  // ── datos ──────────────────────────────────────────────────────────────────
  const [distribuciones, setDistribuciones] = useState<Distribucion[]>([])
  const [asignaciones,   setAsignaciones]   = useState<Asignacion[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  // ── ui ─────────────────────────────────────────────────────────────────────
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando,   setGuardando]   = useState(false)
  const [confirmarId, setConfirmarId] = useState<number | null>(null)
  const [expandidos,  setExpandidos]  = useState<Set<number>>(new Set())
  // ── eliminación con reemplazo (segundo paso, condicional) ────────────────
  const [tramoEliminacion, setTramoEliminacion] = useState<TramoReemplazo | null>(null)
  const [eliminandoId,     setEliminandoId]     = useState<number | null>(null)
  // ── form ───────────────────────────────────────────────────────────────────
  const [form,       setForm]       = useState<DistribucionFormData>(FORM_VACIO)
  const [formErrors, setFormErrors] = useState<Partial<DistribucionFormData>>({})
  // ── filtros ────────────────────────────────────────────────────────────────
  const [filtroTexto,  setFiltroTexto]  = useState("")
  const [filtroCurso,  setFiltroCurso]  = useState("")
  const [filtroTurno,  setFiltroTurno]  = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  // ── carga inicial ──────────────────────────────────────────────────────────
  async function cargar() {
    try {
      setLoading(true)
      const [dist, asig] = await Promise.all([
        distribucionesService.listar(authHeaders),
        distribucionesService.listarAsignaciones(authHeaders),
      ])
      setDistribuciones(dist)
      setAsignaciones(asig)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization])
  // ── derivados ──────────────────────────────────────────────────────────────
  const grupos = useMemo(() => {
    const map = new Map<number, Distribucion[]>()
    for (const d of distribuciones) {
      const lista = map.get(d.asignacionId) ?? []
      lista.push(d)
      map.set(d.asignacionId, lista)
    }
    for (const lista of map.values()) lista.sort((a, b) => b.version - a.version)
    return map
  }, [distribuciones])
  const cursosUnicos = useMemo(() => {
    const vistos = new Set<string>()
    for (const d of distribuciones) {
      const nombre = d.asignacion.curso?.nombre
      if (nombre) vistos.add(nombre)
    }
    return Array.from(vistos).sort()
  }, [distribuciones])
  const turnosUnicos = useMemo(() => {
    const vistos = new Set<string>()
    for (const d of distribuciones) {
      const nombre = d.asignacion.turno?.nombre
      if (nombre) vistos.add(nombre)
    }
    return Array.from(vistos).sort()
  }, [distribuciones])
  const gruposFiltrados = useMemo(() => {
    const q = filtroTexto.toLowerCase().trim()
    const resultado = new Map<number, Distribucion[]>()
    for (const [asignacionId, lista] of grupos.entries()) {
      const asignacion = lista[0].asignacion
      const matchTexto = !q || (
        asignacion.identificadorEstructural.toLowerCase().includes(q) ||
        asignacion.titularidades?.[0]?.agente?.apellido?.toLowerCase().includes(q) ||
        asignacion.titularidades?.[0]?.agente?.nombre?.toLowerCase().includes(q)
      )
      const matchCurso  = !filtroCurso  || asignacion.curso?.nombre  === filtroCurso
      const matchTurno  = !filtroTurno  || asignacion.turno?.nombre  === filtroTurno
      const matchEstado = !filtroEstado || lista.some(d => d.estado  === filtroEstado)
      if (matchTexto && matchCurso && matchTurno && matchEstado) resultado.set(asignacionId, lista)
    }
    return resultado
  }, [grupos, filtroTexto, filtroCurso, filtroTurno, filtroEstado])
  const proximaVersion = useMemo(() => {
    if (!form.asignacionId) return 1
    const lista = grupos.get(Number(form.asignacionId)) ?? []
    if (lista.length === 0) return 1
    return Math.max(...lista.map(d => d.version)) + 1
  }, [form.asignacionId, grupos])
  // UX-DIS-001 — si la asignación seleccionada ya tiene una distribución
  // ACTIVA, crear otra chocaría contra verificarSolapamiento en el backend
  // (409). La detectamos acá para avisar/bloquear antes de intentar el POST.
  const distribucionActivaSeleccionada = useMemo(() => {
    if (!form.asignacionId) return null
    const lista = grupos.get(Number(form.asignacionId)) ?? []
    return lista.find(d => d.estado === "ACTIVO") ?? null
  }, [form.asignacionId, grupos])
  const hayFiltros = !!(filtroTexto || filtroCurso || filtroTurno || filtroEstado)
  const asignacionesConDist = Array.from(grupos.keys())
  const asignacionesSinDist = asignaciones.filter(a => !grupos.has(a.id))
  // Distribuciones que SÍ existen pero todavía no tienen módulos asignados
  // (no generan clases hasta que se complete ese paso). Solo tiene sentido
  // avisar de las que están ACTIVAS — una versión vieja/cerrada sin módulos
  // ya no importa.
  const distribucionesSinModulos = useMemo(
    () => distribuciones.filter(d => d._count.distribucionModulos === 0 && d.estado === "ACTIVO"),
    [distribuciones]
  )
  // ── form helpers ───────────────────────────────────────────────────────────
  function setCampo<K extends keyof DistribucionFormData>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }))
    setFormErrors(p => ({ ...p, [key]: undefined }))
  }
  function validar(): boolean {
    const err: Partial<DistribucionFormData> = {}
    if (!form.asignacionId)         err.asignacionId         = "Requerido"
    if (!form.fecha_vigencia_desde) err.fecha_vigencia_desde = "Requerido"
    setFormErrors(err)
    return Object.keys(err).length === 0
  }
  function abrirForm() {
    setForm(FORM_VACIO)
    setFormErrors({})
    setError(null)
    setMostrarForm(true)
  }
  function cerrarForm() {
    setMostrarForm(false)
    setForm(FORM_VACIO)
    setFormErrors({})
    setError(null)
  }
  // ── acciones ───────────────────────────────────────────────────────────────
  async function crear() {
    if (!validar()) return
    // UX-DIS-001 — resguardo defensivo: el form ya debería estar bloqueado
    // en este caso (botón deshabilitado), pero no confiamos solo en eso.
    if (distribucionActivaSeleccionada) return
    setGuardando(true)
    setError(null)
    try {
      await distribucionesService.crear({
        asignacionId:         Number(form.asignacionId),
        version:              proximaVersion,
        fecha_vigencia_desde: form.fecha_vigencia_desde,
        fecha_vigencia_hasta: form.fecha_vigencia_hasta || null,
      }, authHeaders)
      cerrarForm()
      await cargar()
      setExpandidos(prev => new Set([...prev, Number(form.asignacionId)]))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setGuardando(false)
    }
  }
  // eliminar(id) — primer llamado, sin decisión sobre reemplazo todavía.
  // Si el backend responde requiereConfirmacion, guardamos el tramo y
  // esperamos a que el usuario decida en el modal (confirmarEliminacion).
  // UX-DIS-005 — reusamos el mismo flag `guardando` que ya usa crear():
  // ambos flujos son mutuamente excluyentes en la UI (no hay forma de tener
  // el form de creación y un modal de eliminar abiertos a la vez), así que
  // no hace falta un flag dedicado. Se envuelve todo en try/finally para
  // que se apague incluso en el camino de "requiere confirmación".
  async function eliminar(id: number) {
    setGuardando(true)
    setError(null)
    try {
      const result = await distribucionesService.eliminar(id, authHeaders)
      if (result.requiereConfirmacion) {
        setEliminandoId(id)
        setTramoEliminacion(result.tramos?.[0] ?? null)
        return // no cerramos confirmarId todavía, el modal de tramo lo reemplaza
      }
      await cargar()
      setConfirmarId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
      setConfirmarId(null)
    } finally {
      setGuardando(false)
    }
  }
  // confirmarEliminacion(mantenerReemplazo) — segundo paso, ya con la
  // decisión del usuario sobre el tramo detectado.
  async function confirmarEliminacion(mantenerReemplazo: boolean) {
    if (eliminandoId === null) return
    setGuardando(true)
    setError(null)
    try {
      const result = await distribucionesService.eliminar(eliminandoId, authHeaders, mantenerReemplazo)
      if (!result.deleted) {
        setError("No se pudo eliminar la distribución")
        return
      }
      await cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setEliminandoId(null)
      setTramoEliminacion(null)
      setConfirmarId(null)
      setGuardando(false)
    }
  }
  function cancelarEliminacion() {
    setEliminandoId(null)
    setTramoEliminacion(null)
    setConfirmarId(null)
  }
  function toggleExpandido(asignacionId: number) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(asignacionId) ? next.delete(asignacionId) : next.add(asignacionId)
      return next
    })
  }
  function limpiarFiltros() {
    setFiltroTexto("")
    setFiltroCurso("")
    setFiltroTurno("")
    setFiltroEstado("")
  }
  // ── return ─────────────────────────────────────────────────────────────────
  return {
    // datos
    distribuciones,
    asignaciones,
    loading,
    error,
    setError,
    // derivados
    grupos,
    gruposFiltrados,
    cursosUnicos,
    turnosUnicos,
    proximaVersion,
    distribucionActivaSeleccionada,
    hayFiltros,
    asignacionesConDist,
    asignacionesSinDist,
    distribucionesSinModulos,
    // ui
    mostrarForm,
    guardando,
    confirmarId,
    setConfirmarId,
    expandidos,
    // form
    form,
    formErrors,
    setCampo,
    // acciones
    abrirForm,
    cerrarForm,
    crear,
    eliminar,
    confirmarEliminacion,
    cancelarEliminacion,
    tramoEliminacion,
    toggleExpandido,
    limpiarFiltros,
    // filtros
    filtroTexto,  setFiltroTexto,
    filtroCurso,  setFiltroCurso,
    filtroTurno,  setFiltroTurno,
    filtroEstado, setFiltroEstado,
  }
}