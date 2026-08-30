// features/asignaciones/hooks/useAsignaciones.ts
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { asignacionesService } from "../services/asignacionesService"
import type { Asignacion, Agente, Unidad, Materia, Comision, Turno, AsignacionFormData } from "../types"
import { FORM_VACIO, titularVigente } from "../types"

function hoyISO() {
  const d  = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().split("T")[0]
}

export function useAsignaciones() {
  const { authHeaders } = useAuth()
  // ── datos ──────────────────────────────────────────────────────────────────
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [agentes,      setAgentes]      = useState<Agente[]>([])
  const [unidades,     setUnidades]     = useState<Unidad[]>([])
  const [materias,     setMaterias]     = useState<Materia[]>([])
  const [comisiones,   setComisiones]   = useState<Comision[]>([])
  const [turnos,       setTurnos]       = useState<Turno[]>([])
  // ── ui ─────────────────────────────────────────────────────────────────────
  const [loading,              setLoading]              = useState(true)
  const [loadingCombos,        setLoadingCombos]        = useState(false)
  const [guardando,            setGuardando]            = useState(false)
  const [error,                setError]                = useState<string | null>(null)
  const [mostrarForm,          setMostrarForm]          = useState(false)
  const [mostrarCambioTitular, setMostrarCambioTitular] = useState(false)
  const [editando,             setEditando]             = useState<number | null>(null)
  const [tieneHistorial,       setTieneHistorial]       = useState(false)
  const [confirmarId,          setConfirmarId]          = useState<number | null>(null)
  const [busqueda,             setBusqueda]             = useState("")
  const [verInactivas,         setVerInactivas]         = useState(false)
  // ── form ───────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<AsignacionFormData>(FORM_VACIO)
  // ── carga ──────────────────────────────────────────────────────────────────
  async function cargarAsignaciones() {
    try {
      const data = await asignacionesService.listar(authHeaders, verInactivas)
      setAsignaciones(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando asignaciones")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargarAsignaciones()
  }, [authHeaders.Authorization, verInactivas])
  async function cargarCombos() {
    setLoadingCombos(true)
    try {
      const combos = await asignacionesService.listarCombos(authHeaders)
      setAgentes(combos.agentes)
      setUnidades(combos.unidades)
      setMaterias(combos.materias)
      setComisiones(combos.comisiones)
      setTurnos(combos.turnos)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando opciones")
    } finally {
      setLoadingCombos(false)
    }
  }
  // ── derivados ──────────────────────────────────────────────────────────────
  const comisionesDeUnidad = useMemo(() => {
    if (!form.unidadId) return []
    return comisiones.filter(c => c.unidad?.id === Number(form.unidadId))
  }, [comisiones, form.unidadId])
  const unidadTieneComisiones = comisionesDeUnidad.length > 0
  const materiasFiltradas = useMemo(() => {
    if (!form.cursoId) return []
    return materias.filter(m => m.cursoId === Number(form.cursoId))
  }, [materias, form.cursoId])
  const asignacionesFiltradas = useMemo(() => {
    try {
      const base = verInactivas
        ? asignaciones
        : asignaciones.filter(a => a.activo)
      if (!busqueda.trim()) return base
      const q = busqueda.toLowerCase()
      return base.filter(a => {
        const titular = titularVigente(a)
        return (
          (a.identificadorEstructural ?? "").toLowerCase().includes(q) ||
          (titular?.apellido ?? "").toLowerCase().includes(q) ||
          (titular?.nombre ?? "").toLowerCase().includes(q) ||
          (titular?.documento ?? "").toLowerCase().includes(q)
        )
      })
    } catch {
      return []
    }
  }, [asignaciones, busqueda, verInactivas])
  // ── form helpers ───────────────────────────────────────────────────────────
  function setCampo<K extends keyof AsignacionFormData>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  function onUnidadChange(unidadId: string) {
    setForm(prev => ({ ...prev, unidadId, comisionId: "", cursoId: "", materiaId: "", turnoId: "" }))
  }
  function onComisionChange(comisionId: string) {
    setForm(prev => {
      if (!comisionId) return { ...prev, comisionId: "", cursoId: "", materiaId: "", turnoId: "" }
      const comision = comisiones.find(c => c.id === Number(comisionId))
      if (!comision) return prev
      const cursoId = String(comision.curso.id)
      const materiaSigueSiendoValida =
        prev.materiaId &&
        materias.some(m => m.id === Number(prev.materiaId) && m.cursoId === Number(cursoId))
      return {
        ...prev,
        comisionId,
        cursoId,
        turnoId:   String(comision.turno.id),
        materiaId: materiaSigueSiendoValida ? prev.materiaId : "",
      }
    })
  }
  // ── acciones form ──────────────────────────────────────────────────────────
  async function abrirCrear() {
    setForm(FORM_VACIO)
    setEditando(null)
    setTieneHistorial(false)
    setMostrarForm(true)
    setMostrarCambioTitular(false)
    setError(null)
    await cargarCombos()
  }
  async function abrirEditar(a: Asignacion) {
    setEditando(a.id)
    setMostrarForm(true)
    setMostrarCambioTitular(false)
    setError(null)
    await cargarCombos()
    // Verificar si tiene historial para bloquear campos estructurales
    try {
      const historial = await asignacionesService.tieneHistorial(a.id, authHeaders)
      setTieneHistorial(historial)
    } catch {
      setTieneHistorial(false)
    }
    setForm({
      agenteId:                 "",
      fechaDesde:               "",
      unidadId:                 String(a.unidad.id),
      identificadorEstructural: a.identificadorEstructural,
      fecha_inicio:             a.fecha_inicio.split("T")[0],
      fecha_fin:                a.fecha_fin ? a.fecha_fin.split("T")[0] : "",
      materiaId:                a.materia ? String(a.materia.id) : "",
      cursoId:                  a.comision?.curso?.id ? String(a.comision.curso.id) : "",
      comisionId:               a.comision ? String(a.comision.id) : "",
      turnoId:                  a.turno    ? String(a.turno.id)   : "",
    })
  }
  async function abrirCambiarTitular(a: Asignacion) {
    const titular = titularVigente(a)
    setForm({ ...FORM_VACIO, agenteId: titular ? String(titular.id) : "", fechaDesde: hoyISO() })
    setEditando(a.id)
    setMostrarCambioTitular(true)
    setMostrarForm(false)
    setError(null)
    await cargarCombos()
  }
  function cancelar() {
    setMostrarForm(false)
    setMostrarCambioTitular(false)
    setEditando(null)
    setTieneHistorial(false)
    setForm(FORM_VACIO)
    setError(null)
  }
  // ── acciones CRUD ──────────────────────────────────────────────────────────
  async function guardarAsignacion() {
    setGuardando(true)
    setError(null)
    try {
      const isNueva = !editando
      const body = isNueva
        ? {
            agenteId:                 form.agenteId ? Number(form.agenteId) : null,
            unidadId:                 Number(form.unidadId),
            identificadorEstructural: form.identificadorEstructural,
            fecha_inicio:             form.fecha_inicio,
            fecha_fin:                form.fecha_fin || null,
            materiaId:                form.materiaId  ? Number(form.materiaId)  : null,
            comisionId:               form.comisionId ? Number(form.comisionId) : null,
            turnoId:                  form.turnoId    ? Number(form.turnoId)    : null,
          }
        : {
            unidadId:                 Number(form.unidadId),
            identificadorEstructural: form.identificadorEstructural,
            fecha_inicio:             form.fecha_inicio,
            fecha_fin:                form.fecha_fin || null,
            materiaId:                form.materiaId  ? Number(form.materiaId)  : null,
            comisionId:               form.comisionId ? Number(form.comisionId) : null,
            turnoId:                  form.turnoId    ? Number(form.turnoId)    : null,
          }
      if (isNueva) {
        await asignacionesService.crear(body, authHeaders)
      } else {
        await asignacionesService.actualizar(editando!, body, authHeaders)
      }
      await cargarAsignaciones()
      cancelar()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setGuardando(false)
    }
  }
  async function eliminar(id: number) {
    try {
      await asignacionesService.eliminar(id, authHeaders)
      await cargarAsignaciones()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setConfirmarId(null)
    }
  }
  async function reactivar(id: number) {
    try {
      await asignacionesService.reactivar(id, authHeaders)
      setAsignaciones(prev => prev.map(a =>
        a.id === id ? { ...a, activo: true, deletedAt: null, estado: "ACTIVO" } : a
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    }
  }
  async function guardarCambioTitular() {
    if (!editando) return
    setGuardando(true)
    setError(null)
    try {
      await asignacionesService.cambiarTitular(editando, Number(form.agenteId), form.fechaDesde || hoyISO(), authHeaders)
      await cargarAsignaciones()
      cancelar()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setGuardando(false)
    }
  }
  // ── return ─────────────────────────────────────────────────────────────────
  return {
    asignaciones,
    agentes, unidades, materias, comisiones, turnos,
    asignacionesFiltradas, comisionesDeUnidad, materiasFiltradas, unidadTieneComisiones,
    loading, loadingCombos, guardando, error, setError,
    mostrarForm, mostrarCambioTitular, editando, tieneHistorial,
    confirmarId, setConfirmarId,
    busqueda, setBusqueda, verInactivas, setVerInactivas,
    form, setCampo, onUnidadChange, onComisionChange,
    abrirCrear, abrirEditar, abrirCambiarTitular, cancelar,
    guardarAsignacion, eliminar, reactivar, guardarCambioTitular,
  }
}