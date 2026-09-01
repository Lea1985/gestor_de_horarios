// features/modulosDistribucion/hooks/useModulosDistribucion.ts
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { modulosDistribucionService } from "../services/modulosDistribucionService"
import type { Modulo, Distribucion, TramoReemplazo } from "../types"
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
  // UX-DIS-003 — confirmar antes de guardar cambios sobre módulos YA
  // asignados: ese guardado puede suspender clases existentes que dejen de
  // coincidir con la nueva selección, y antes solo se avisaba si había un
  // reemplazo activo de por medio (ModalMigrarReemplazos). La primera
  // asignación de módulos a una distribución vacía no pasa por acá porque
  // ahí no hay clases previas que puedan verse afectadas.
  const [confirmarEdicion, setConfirmarEdicion] = useState(false)
  // ── migración de reemplazos ───────────────────────────────────────────────
  // Antes: lista de incidencias para elegir cuáles migrar (checkboxes).
  // Ahora: un único tramo (o ninguno) — la pregunta es sí/no mantenerlo.
  const [tramoAConfirmar, setTramoAConfirmar] = useState<TramoReemplazo | null>(null)
  // Aviso informativo: se guardaron los módulos pero no hay período ACTIVO,
  // así que no se generó ninguna clase todavía (se generarán cuando se
  // active un período, vía activarPeriodo).
  const [avisoSinPeriodo, setAvisoSinPeriodo] = useState(false)
  // Tramo a confirmar al crear una NUEVA VERSIÓN (distinto del tramo de
  // reasignar módulos — acá nunca hay migración posible porque la versión
  // nueva todavía no tiene módulos, solo se informa antes de perderlo).
  const [tramoNuevaVersion, setTramoNuevaVersion] = useState<TramoReemplazo | null>(null)
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
  // mantenerReemplazo: undefined = primer intento (puede volver requiereConfirmacion).
  //                     true/false = respuesta del usuario al modal.
  async function guardar(mantenerReemplazo?: boolean) {
    setGuardando(true)
    setError(null)
    setGuardado(false)
    try {
      const data = await modulosDistribucionService.guardarModulos(
        distribuidonId, seleccionados, authHeaders, mantenerReemplazo
      )
      if (data.requiereConfirmacion) {
        setTramoAConfirmar(data.tramos?.[0] ?? null)
        return // esperamos que el usuario decida en el modal
      }
      setTramoAConfirmar(null)
      setAvisoSinPeriodo(!!data.avisoSinPeriodoActivo)
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
  // UX-DIS-003 — punto de entrada desde el botón "Guardar cambios". Si se
  // está editando módulos ya asignados (podría haber clases que se
  // suspendan), pedimos confirmación primero. Si es la primera asignación
  // de módulos (distribución recién creada, sin módulos todavía), no hay
  // clases previas en juego y se guarda directo.
  function pedirGuardar() {
    if (editando) {
      setConfirmarEdicion(true)
      return
    }
    guardar()
  }
  function confirmarGuardarEdicion() {
    setConfirmarEdicion(false)
    guardar()
  }
  function cancelarConfirmarEdicion() {
    setConfirmarEdicion(false)
  }
  function cancelarMigracion() {
    setTramoAConfirmar(null)
  }
  // Primer intento: sin decisión sobre reemplazo todavía. Si el backend
  // responde requiereConfirmacion, guardamos el tramo y esperamos a que
  // el usuario decida (confirmarNuevaVersion) antes de seguir.
  async function crearNuevaVersion(mantenerReemplazo?: boolean) {
    setCreandoVersion(true)
    setError(null)
    try {
      const data = await modulosDistribucionService.crearNuevaVersion(
        distribuidonId, authHeaders, mantenerReemplazo
      )
      if (data.requiereConfirmacion) {
        setTramoNuevaVersion(data.tramos?.[0] ?? null)
        return // el modal de tramo reemplaza a ModalNuevaVersion, no navegamos
      }
      setTramoNuevaVersion(null)
      setModalVersion(false)
      router.push(`/protected/dashboard/distribuciones/${data.nuevaVersionId}/modulos`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setCreandoVersion(false)
    }
  }
  function cancelarNuevaVersion() {
    setTramoNuevaVersion(null)
    setModalVersion(false)
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
    confirmarEdicion,
    confirmarGuardarEdicion,
    cancelarConfirmarEdicion,
    // migración de reemplazos
    tramoAConfirmar,
    cancelarMigracion,
    avisoSinPeriodo,
    tramoNuevaVersion,
    cancelarNuevaVersion,
    // acciones
    toggle,
    toggleDia,
    cancelarEdicion,
    guardar,
    pedirGuardar,
    crearNuevaVersion,
  }
}