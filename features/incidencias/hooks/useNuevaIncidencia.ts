// features/incidencias/hooks/useNuevaIncidencia.ts
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import {
  fetchAsignaciones,
  fetchCodigarios,
  fetchItemsCodigario,
  crearIncidencia,
} from "../services/incidenciasService"
import type {
  AsignacionParaIncidencia,
  Codigario,
  CodigarioItem,
  DatosComunes,
  ResultadoCarga,
  ResultadoReemplazo,
} from "../types"
import { DATOS_VACIO } from "../types"
export function nombreAgente(a: AsignacionParaIncidencia): string {
  const agente = a.titularidades[0]?.agente
  if (!agente) return "Vacante"
  return `${agente.apellido}, ${agente.nombre}`
}
// ── Tipos locales para el paso 4 ─────────────────────────────
export type ClaseParaReemplazo = {
  id:          number
  fecha:       string        // ISO date string
  estado:      string
  moduloId:    number | null
  modulo?: {
    dia_semana: string
    hora_desde: number
    hora_hasta: number
  } | null
  asignacionId: number
  // enriquecido en el hook
  agente:        string
  identificador: string
}
export type ReemplazoConfig = {
  claseId:             number
  asignacionTitularId: number
  agenteSuplenteId:    number | null
  observacion:         string
}
// ── Helpers ───────────────────────────────────────────────────
function minutosAHora(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, "0")
  const m = (min % 60).toString().padStart(2, "0")
  return `${h}:${m}`
}
export function formatearModulo(clase: ClaseParaReemplazo): string {
  if (!clase.modulo) return "Sin módulo"
  return `${clase.modulo.dia_semana} ${minutosAHora(clase.modulo.hora_desde)}–${minutosAHora(clase.modulo.hora_hasta)}`
}
export function formatearFecha(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })
}
// ── Hook ──────────────────────────────────────────────────────
export function useNuevaIncidencia() {
  const { authHeaders } = useAuth()
  // ── Datos base ───────────────────────────────────────────────
  const [asignaciones, setAsignaciones] = useState<AsignacionParaIncidencia[]>([])
  const [codigarios,   setCodigarios]   = useState<Codigario[]>([])
  const [items,        setItems]        = useState<CodigarioItem[]>([])
  const [loadingBase,  setLoadingBase]  = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  // ── Pasos ────────────────────────────────────────────────────
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1)
  // ── Selección ────────────────────────────────────────────────
  const [filtroTexto,   setFiltroTexto]   = useState("")
  const [filtroCurso,   setFiltroCurso]   = useState("")
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  // ── Formulario incidencia ────────────────────────────────────
  const [datos,     setDatos]     = useState<DatosComunes>(DATOS_VACIO)
  const [datosErr,  setDatosErr]  = useState<Partial<DatosComunes>>({})
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCarga[] | null>(null)
  // UX-INC-002: resultado de los POST /api/reemplazos del paso 4 (antes
  // se descartaba silenciosamente). null = no se intentó ningún
  // reemplazo todavía (o se salteó el paso).
  const [resultadoReemplazos, setResultadoReemplazos] = useState<ResultadoReemplazo[] | null>(null)
  // ── Paso 4: reemplazos ───────────────────────────────────────
  // Clases reales obtenidas tras crear las incidencias
  const [clasesReemplazo,    setClasesReemplazo]    = useState<ClaseParaReemplazo[]>([])
  const [loadingClases,      setLoadingClases]      = useState(false)
  // IDs de clases seleccionadas para tener reemplazo
  const [clasesSeleccionadas, setClasesSeleccionadas] = useState<Set<number>>(new Set())
  // Configuración por clase: claseId → ReemplazoConfig
  const [reemplazos, setReemplazos] = useState<Map<number, ReemplazoConfig>>(new Map())
  // Suplente global para "aplicar a todas"
  const [suplenteGlobal,     setSuplenteGlobal]     = useState<number | null>(null)
  const [guardandoReemplazos, setGuardandoReemplazos] = useState(false)
  // Incidencias creadas (necesitamos asignacionId → incidenciaId para buscar clases)
const [incidenciasCreadas, setIncidenciasCreadas] = useState<{ asignacionId: number; incidenciaId: number }[]>([])
  // ── Carga inicial ────────────────────────────────────────────
  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    async function cargar() {
      try {
        const [a, c] = await Promise.all([
          fetchAsignaciones(authHeaders),
          fetchCodigarios(authHeaders),
        ])
        setAsignaciones(a)
        setCodigarios(c)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error cargando datos")
      } finally {
        setLoadingBase(false)
      }
    }
    cargar()
  }, [authHeaders.Authorization])
  // ── Items cuando cambia codigario ────────────────────────────
  useEffect(() => {
    if (!datos.codigarioId) {
      setItems([])
      setDatos(p => ({ ...p, codigarioItemId: "" }))
      return
    }
    setLoadingItems(true)
    fetchItemsCodigario(datos.codigarioId, authHeaders)
      .then(i => { setItems(i); setDatos(p => ({ ...p, codigarioItemId: "" })) })
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false))
  }, [datos.codigarioId])
  // ── Derivados ────────────────────────────────────────────────
  const cursosUnicos = useMemo(() => {
    const vistos = new Map<number, string>()
    asignaciones.forEach(a => {
      if (a.comision?.curso) vistos.set(a.comision.curso.id, a.comision.curso.nombre)
    })
    return Array.from(vistos.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [asignaciones])
  const asignacionesFiltradas = useMemo(() => {
    const q = filtroTexto.toLowerCase().trim()
    return asignaciones.filter(a => {
      const agente = a.titularidades[0]?.agente
      const matchTexto = !q || (
        a.identificadorEstructural.toLowerCase().includes(q)       ||
        (agente?.apellido.toLowerCase().includes(q)  ?? false)     ||
        (agente?.nombre.toLowerCase().includes(q)    ?? false)     ||
        (agente?.documento.toLowerCase().includes(q) ?? false)
      )
      const matchCurso = !filtroCurso || a.comision?.curso?.id === Number(filtroCurso)
      return matchTexto && matchCurso
    })
  }, [asignaciones, filtroTexto, filtroCurso])
  const asignacionesLote = useMemo(
    () => asignaciones.filter(a => seleccionados.includes(a.id)),
    [asignaciones, seleccionados]
  )
  // ── Selección de asignaciones ────────────────────────────────
  function toggleSeleccion(id: number) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  function toggleTodos() {
    // UX-INC-014: "seleccionar todos" no debe marcar las asignaciones sin
    // clases vigentes -- quedarían tildadas pero el checkbox de su fila
    // está deshabilitado, así que ni siquiera se podrían destildar a mano.
    const idsFiltrados = asignacionesFiltradas
      .filter(a => a.tieneClasesVigentes)
      .map(a => a.id)
    const todosSeleccionados = idsFiltrados.length > 0 && idsFiltrados.every(id => seleccionados.includes(id))
    if (todosSeleccionados) {
      setSeleccionados(prev => prev.filter(id => !idsFiltrados.includes(id)))
    } else {
      setSeleccionados(prev => [...new Set([...prev, ...idsFiltrados])])
    }
  }
  function quitarDelLote(id: number) {
    setSeleccionados(prev => prev.filter(x => x !== id))
  }
  // ── Validación formulario ────────────────────────────────────
  function validarDatos(): boolean {
    const err: Partial<DatosComunes> = {}
    if (!datos.codigarioId)     err.codigarioId     = "Requerido"
    if (!datos.codigarioItemId) err.codigarioItemId = "Requerido"
    if (!datos.fecha_desde)     err.fecha_desde     = "Requerido"
    if (!datos.fecha_hasta)     err.fecha_hasta     = "Requerido"
    setDatosErr(err)
    return Object.keys(err).length === 0
  }
  // ── Guardar incidencias y cargar clases para paso 4 ──────────
  async function guardarLoteYContinuar() {
    if (!validarDatos()) return
    setGuardando(true)
    setError(null)
    const resultados: ResultadoCarga[] = []
    const creadas: { asignacionId: number; incidenciaId: number }[] = []
    for (const a of asignacionesLote) {
      try {
        const incidencia = await crearIncidencia({
          asignacionId:    a.id,
          codigarioItemId: Number(datos.codigarioItemId),
          fecha_desde:     datos.fecha_desde,
          fecha_hasta:     datos.fecha_hasta,
          observacion:     datos.observacion || undefined,
        }, authHeaders)
        resultados.push({
          asignacionId:  a.id,
          identificador: a.identificadorEstructural,
          agente:        nombreAgente(a),
          ok:            true,
        })
        creadas.push({ asignacionId: a.id, incidenciaId: incidencia.id })
      } catch (e: unknown) {
        resultados.push({
          asignacionId:  a.id,
          identificador: a.identificadorEstructural,
          agente:        nombreAgente(a),
          ok:            false,
          error:         e instanceof Error ? e.message : "Error de red",
        })
      }
    }
    setGuardando(false)
    // Si todo falló, mostrar resultado directamente.
    // UX-INC-013: antes esto guardaba el resultado (con el mensaje de
    // error real de cada asignación, ej. "No hay clases programadas...")
    // pero nunca navegaba a la pantalla que lo muestra -- el wizard se
    // quedaba en el paso 3 sin ningún indicio de que falló ni por qué.
    // La pantalla de resultado (paso 5, componente ResultadoCarga) ya
    // sabe listar resultados con ok:false y su error.
    if (creadas.length === 0) {
      setResultado(resultados)
      setPaso(5 as never)
      return
    }
    // Guardar incidencias creadas y resultados parciales para el resultado final
    setIncidenciasCreadas(creadas)
    // Guardamos los resultados de incidencias para mostrarlos al final
    setResultado(resultados) // temporal — se pisa al finalizar reemplazos
    setResultadoReemplazos(null)
    // Cargar clases reales de cada incidencia creada
    setLoadingClases(true)
    setPaso(4)
    try {
      const todasLasClases: ClaseParaReemplazo[] = []
      // UX-INC-008: antes, si el GET de clases de una incidencia recién
      // creada fallaba, esa asignación desaparecía en silencio del paso 4
      // -- sin distinguir "no tiene clases en el rango" de "falló la
      // carga". La incidencia SÍ se creó (eso no se puede deshacer acá),
      // así que se avisa cuáles quedaron sin poder cargar sus clases para
      // que el usuario sepa que tiene que ir a asignarles el reemplazo
      // manualmente desde el detalle.
      const erroresCargaClases: { asignacionId: number; identificador: string }[] = []
      for (const { asignacionId, incidenciaId } of creadas) {
        const asignacion = asignacionesLote.find(a => a.id === asignacionId)
        if (!asignacion) continue
        const res = await fetch(`/api/incidencias/${incidenciaId}/clases`, {
          headers: authHeaders,
        })
        if (!res.ok) {
          erroresCargaClases.push({ asignacionId, identificador: asignacion.identificadorEstructural })
          continue
        }
        const clases = await res.json()
        for (const clase of clases) {
          todasLasClases.push({
            ...clase,
            agente:        nombreAgente(asignacion),
            identificador: asignacion.identificadorEstructural,
          })
        }
      }
      if (erroresCargaClases.length > 0) {
        setError(
          `La${erroresCargaClases.length !== 1 ? "s" : ""} incidencia${erroresCargaClases.length !== 1 ? "s" : ""} se creó${erroresCargaClases.length !== 1 ? "ron" : ""} igual, pero no se ${erroresCargaClases.length !== 1 ? "pudieron" : "pudo"} cargar sus clases para asignar reemplazo acá (${erroresCargaClases.map(e => e.identificador).join(", ")}). Asigná el reemplazo manualmente desde el detalle de cada una.`
        )
      }
      // Ordenar por fecha
      todasLasClases.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      setClasesReemplazo(todasLasClases)
      // Pre-seleccionar todas las clases SUSPENDIDAS por esta incidencia —
      // son las que necesitan reemplazo. A esta altura del flujo la
      // incidencia ya se creó y ya las suspendió: nunca van a estar en
      // PROGRAMADA (ese filtro era el bug — daba siempre vacío).
      const elegibles = new Set(
        todasLasClases
          .filter(c => c.estado === "SUSPENDIDA")
          .map(c => c.id)
      )
      setClasesSeleccionadas(elegibles)
      // Inicializar configuración de reemplazos vacía
      const configInicial = new Map<number, ReemplazoConfig>()
      todasLasClases
        .filter(c => c.estado === "SUSPENDIDA")
        .forEach(c => {
          const asignacion = creadas.find(x => x.asignacionId === c.asignacionId)
          configInicial.set(c.id, {
            claseId:             c.id,
            asignacionTitularId: c.asignacionId,
            agenteSuplenteId:    null,
            observacion:         "",
          })
        })
      setReemplazos(configInicial)
    } catch {
      // Si falla la carga de clases, ir directo al resultado
      setPaso(4) // se muestra paso 4 vacío con opción de saltar
    } finally {
      setLoadingClases(false)
    }
  }
  // ── Selección de clases para reemplazo ───────────────────────
  function toggleClase(claseId: number) {
    setClasesSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(claseId)) {
        next.delete(claseId)
      } else {
        next.add(claseId)
        // Asegurar que tenga config
        if (!reemplazos.has(claseId)) {
          const clase = clasesReemplazo.find(c => c.id === claseId)
          if (clase) {
            setReemplazos(r => {
              const m = new Map(r)
              m.set(claseId, {
                claseId,
                asignacionTitularId: clase.asignacionId,
                agenteSuplenteId:    suplenteGlobal,
                observacion:         "",
              })
              return m
            })
          }
        }
      }
      return next
    })
  }
  function toggleTodasClases() {
    const elegibles = clasesReemplazo.filter(c => c.estado === "SUSPENDIDA")
    const todasSeleccionadas = elegibles.every(c => clasesSeleccionadas.has(c.id))
    if (todasSeleccionadas) {
      setClasesSeleccionadas(new Set())
    } else {
      setClasesSeleccionadas(new Set(elegibles.map(c => c.id)))
    }
  }
  function setSuplenteClase(claseId: number, agenteSuplenteId: number | null) {
    setReemplazos(prev => {
      const m = new Map(prev)
      const config = m.get(claseId)
      if (config) {
        m.set(claseId, { ...config, agenteSuplenteId })
      }
      return m
    })
  }
  function setObservacionClase(claseId: number, observacion: string) {
    setReemplazos(prev => {
      const m = new Map(prev)
      const config = m.get(claseId)
      if (config) {
        m.set(claseId, { ...config, observacion })
      }
      return m
    })
  }
  // Aplica el suplente global a todas las clases seleccionadas
  function aplicarSuplenteGlobal() {
    if (!suplenteGlobal) return
    setReemplazos(prev => {
      const m = new Map(prev)
      clasesSeleccionadas.forEach(claseId => {
        const config = m.get(claseId)
        if (config) {
          m.set(claseId, { ...config, agenteSuplenteId: suplenteGlobal })
        }
      })
      return m
    })
  }
  // ── Guardar reemplazos ───────────────────────────────────────
  async function guardarReemplazos() {
    setGuardandoReemplazos(true)
    const clasesConReemplazo = Array.from(clasesSeleccionadas)
      .map(id => reemplazos.get(id))
      .filter((r): r is ReemplazoConfig => !!r && r.agenteSuplenteId !== null)
    // Crear reemplazos en paralelo
    const promesas = clasesConReemplazo.map(config =>
      fetch("/api/reemplazos", {
        method:  "POST",
        headers: authHeaders,
        body: JSON.stringify({
          claseId:             config.claseId,
          asignacionTitularId: config.asignacionTitularId,
          agenteSuplenteId:    config.agenteSuplenteId,
          observacion:         config.observacion || undefined,
        }),
      }).then(async r => ({
        claseId: config.claseId,
        ok:      r.ok,
        error:   r.ok ? undefined : ((await r.json().catch(() => null))?.error ?? "Error desconocido"),
      })).catch(() => ({
        claseId: config.claseId,
        ok:      false as const,
        error:   "Error de red",
      }))
    )
    // UX-INC-002: antes el resultado de este Promise.all se descartaba
    // por completo y el usuario terminaba creyendo que todas las clases
    // habían quedado cubiertas, aunque algún POST hubiera fallado. Ahora
    // se captura cada resultado, se enriquece con el contexto de la
    // clase (identificador, agente, fecha, módulo) y se muestra en la
    // pantalla de resultado final.
    const resultados = await Promise.all(promesas)
    setGuardandoReemplazos(false)
    const enriquecidos: ResultadoReemplazo[] = resultados.map(r => {
      const clase = clasesReemplazo.find(c => c.id === r.claseId)
      return {
        claseId:       r.claseId,
        identificador: clase?.identificador ?? "—",
        agente:        clase?.agente ?? "—",
        fecha:         clase ? formatearFecha(clase.fecha) : "—",
        modulo:        clase ? formatearModulo(clase) : "—",
        ok:            r.ok,
        error:         r.error,
      }
    })
    setResultadoReemplazos(enriquecidos.length > 0 ? enriquecidos : null)
    // Ir al resultado final (el resultado de incidencias ya está en estado)
    setPaso(5 as never) // señal para mostrar resultado
  }
  // ── Saltear reemplazos ───────────────────────────────────────
  function saltearReemplazos() {
    // No se intentó crear ningún reemplazo — no hay nada que reportar.
    setResultadoReemplazos(null)
    setPaso(5 as never)
  }
  // ── Reintentar solo las fallidas ──────────────────────────────
  // UX-INC-004: antes, "Reintentar fallidas" solo hacía setPaso(3) sin
  // tocar `seleccionados` -- el lote completo (incluidas las asignaciones
  // que YA se habían creado con éxito) volvía a intentarse, generando un
  // SuperposicionError confuso para las que no tenían nada que reintentar.
  // Ahora se recorta `seleccionados` a las asignaciones que efectivamente
  // fallaron antes de volver al formulario.
  function reintentarFallidas() {
    if (!resultado) return
    const fallidos = resultado.filter(r => !r.ok).map(r => r.asignacionId)
    setSeleccionados(fallidos)
    setResultado(null)
    setPaso(3)
  }
  // Clases agrupadas por asignación para el UI
  const clasesAgrupadasPorAsignacion = useMemo(() => {
    const grupos = new Map<number, { agente: string; identificador: string; clases: ClaseParaReemplazo[] }>()
    for (const clase of clasesReemplazo) {
      if (!grupos.has(clase.asignacionId)) {
        grupos.set(clase.asignacionId, {
          agente:        clase.agente,
          identificador: clase.identificador,
          clases:        [],
        })
      }
      grupos.get(clase.asignacionId)!.clases.push(clase)
    }
    return Array.from(grupos.entries()).map(([asignacionId, datos]) => ({
      asignacionId,
      ...datos,
    }))
  }, [clasesReemplazo])
  const clasesConSuplenteIncompleto = useMemo(() => {
    return Array.from(clasesSeleccionadas).filter(id => {
      const config = reemplazos.get(id)
      return !config || config.agenteSuplenteId === null
    })
  }, [clasesSeleccionadas, reemplazos])
  return {
    // estado base
    loadingBase, error, setError,
    paso, setPaso,
    // selección asignaciones
    filtroTexto, setFiltroTexto,
    filtroCurso, setFiltroCurso,
    cursosUnicos,
    asignacionesFiltradas,
    asignacionesLote,
    seleccionados,
    toggleSeleccion, toggleTodos, quitarDelLote,
    // formulario incidencia
    codigarios, items, loadingItems,
    datos, setDatos,
    datosErr, setDatosErr,
    guardando,
    resultado, setResultado,
    resultadoReemplazos,
    reintentarFallidas,
    // paso 4
    clasesReemplazo,
    clasesAgrupadasPorAsignacion,
    loadingClases,
    clasesSeleccionadas,
    reemplazos,
    suplenteGlobal, setSuplenteGlobal,
    guardandoReemplazos,
    clasesConSuplenteIncompleto,
    toggleClase,
    toggleTodasClases,
    setSuplenteClase,
    setObservacionClase,
    aplicarSuplenteGlobal,
    // acciones
    guardarLoteYContinuar,
    guardarReemplazos,
    saltearReemplazos,
  }
}