// lib/services/resolucionClaseService.ts
//
// Motor de Resolución: determina estado y causa final de una ClaseProgramada
// evaluando todas las condiciones vigentes. Es el único módulo autorizado a
// decidir el estado final de una clase (ver invariantes de Resolución en el
// documento de arquitectura).
//
// Cubre todas las causas: FIN_ASIGNACION, CAMBIO_DISTRIBUCION, INCIDENCIA,
// PERIODO_OPERATIVO, CALENDARIO_ESCOLAR y NINGUNA/DICTADA. Desde la Fase 3,
// FIN_ASIGNACION y CAMBIO_DISTRIBUCION también se escriben solo por acá (vía
// reconciliarAsignacion); los atajos en lote se retiraron.
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "@/lib/prisma"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseTermino } from "@/lib/helpers/fechaInstitucion"
import type { CondicionesVigentes, ResultadoResolucion } from "@/lib/types/claseProgramada"
import type { Db } from "@/lib/types/db"

/**
 * Función pura: aplica la tabla de precedencia definida en el documento de
 * arquitectura. No toca la base ni el reloj -- recibe "fechaYaPaso" ya
 * calculado, para que siga siendo fácil de testear con tablas de casos
 * (tests/resolverEstadoYCausa.test.ts).
 *
 * Orden de precedencia (mayor a menor):
 *   1. FIN_ASIGNACION       -> SUSPENDIDA (la asignación no rige en esa fecha)
 *   2. CAMBIO_DISTRIBUCION  -> SUSPENDIDA (el módulo no está en la distribución
 *                              vigente en esa fecha)
 *      1 y 2 no se aplican a una clase ya DICTADA: el hecho pasó, y
 *      reescribirlo es tarea de la reconciliación explícita, no de una
 *      re-resolución. Para la DICTADA se sigue evaluando desde 3.
 *   3. INCIDENCIA           -> REEMPLAZADA (si tiene reemplazo) o SUSPENDIDA.
 *                              Con evento de calendario y un artículo que NO
 *                              paga, la incidencia cede y se sigue evaluando
 *                              (queda CALENDARIO_ESCOLAR; la fila de Reemplazo
 *                              no se toca, solo deja de estar vigente).
 *   4. PERIODO_OPERATIVO    -> SUSPENDIDA (el período ya no cubre esa fecha)
 *   5. CALENDARIO_ESCOLAR   -> SUSPENDIDA
 *   6. Si nada de lo anterior aplica y la fecha ya pasó -> DICTADA
 *   7. NINGUNA              -> PROGRAMADA
 */
export function resolverEstadoYCausa(condiciones: CondicionesVigentes): ResultadoResolucion {
  const yaDictada = condiciones.estadoActual === EstadoClase.DICTADA
  if (!yaDictada && !condiciones.asignacionVigente) {
    return { estado: EstadoClase.SUSPENDIDA, causa: Causa.FIN_ASIGNACION }
  }
  if (!yaDictada && !condiciones.moduloVigente) {
    return { estado: EstadoClase.SUSPENDIDA, causa: Causa.CAMBIO_DISTRIBUCION }
  }
  // articuloPaga null (no consultado) cuenta como "paga": la incidencia
  // conserva la prioridad que tenía antes de esta regla.
  const feriadoSinPago = condiciones.tieneEventoCalendario && condiciones.articuloPaga === false
  if (condiciones.tieneIncidenciaActiva && !feriadoSinPago) {
    return {
      estado: condiciones.tieneReemplazoAsignado ? EstadoClase.REEMPLAZADA : EstadoClase.SUSPENDIDA,
      causa:  Causa.INCIDENCIA,
    }
  }
  if (!condiciones.periodoOperativoVigente) {
    // Sin período vigente: si la fecha ya pasó, se asume dictada -- no
    // tiene sentido "suspender por período" algo que ya ocurrió. Si
    // todavía no pasó, sí queda suspendida por PERIODO_OPERATIVO.
    return condiciones.fechaYaPaso
      ? { estado: EstadoClase.DICTADA, causa: Causa.NINGUNA }
      : { estado: EstadoClase.SUSPENDIDA, causa: Causa.PERIODO_OPERATIVO }
  }
  if (condiciones.tieneEventoCalendario) {
    return { estado: EstadoClase.SUSPENDIDA, causa: Causa.CALENDARIO_ESCOLAR }
  }
  if (condiciones.fechaYaPaso) {
    return { estado: EstadoClase.DICTADA, causa: Causa.NINGUNA }
  }
  return { estado: EstadoClase.PROGRAMADA, causa: Causa.NINGUNA }
}

// Fecha de calendario de la clase como medianoche UTC (la representación de
// fechas del sistema; algunas filas traen hora y se normalizan acá).
function diaDe(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()))
}

function finDelDia(dia: Date): Date {
  return new Date(dia.getTime() + 24 * 60 * 60 * 1000 - 1)
}

// Lo eliminado sigue rigiendo para las clases que ya habían terminado en el
// momento de la baja (días anteriores, o el mismo día con la hora de fin ya
// pasada); para el resto deja de regir desde el día local de su deletedAt.
function rigeEn(dia: Date, horaHasta: number | null, deletedAt: Date | null): boolean {
  return deletedAt === null || claseTermino({ fecha: dia, horaHasta, ahora: deletedAt })
}

/**
 * Junta el estado real de una ClaseProgramada puntual desde la base y arma
 * el objeto CondicionesVigentes que consume resolverEstadoYCausa.
 *
 * tieneEventoCalendario se consulta EN VIVO contra CalendarioEscolar por
 * fecha (institucionId + periodoOperativoId vigente + fecha + suspendeClases
 * activo), en vez de confiar en el calendarioEscolarId cacheado en la fila
 * de ClaseProgramada -- ver historial de este archivo, confirmado con datos
 * reales el 03/08/2026.
 *
 * fechaYaPaso: la clase ya terminó en la hora local de la institución
 * (claseTermino): fecha anterior a hoy, o de hoy con la hora de fin del
 * módulo ya pasada. Sin módulo (cargos por jornal) se usa el fin del turno
 * de la asignación; si tampoco hay, el fin del día. Es lo único que decide DICTADA
 * cuando ninguna otra causa aplica -- reemplaza la lógica ad-hoc que antes
 * vivía en cerrarPeriodo.ts (que marcaba DICTADA sin mirar si la fecha
 * era futura, bug real confirmado el 03/08/2026).
 *
 * asignacionVigente: la asignación rige en la fecha de la clase -- hasta
 * fecha_fin inclusive si existe, y si fue eliminada solo para las clases que
 * ya habían terminado al momento de la baja (el día de la baja rige para las
 * que terminaron antes de su hora, no para las demás). activo=false sin deletedAt
 * no tiene día de corte: no rige para ninguna fecha.
 *
 * moduloVigente: alguna versión de distribución de la asignación cuya
 * vigencia cubre la fecha incluye el módulo de la clase. No filtra por
 * estado/activo (las versiones viejas quedan INACTIVO pero siguen rigiendo
 * su tramo); una versión eliminada cuenta para fechas anteriores al día
 * local de su deletedAt. Sin módulo (jornal) no aplica.
 *
 * tieneIncidenciaActiva: la incidencia vinculada existe, está activa y no
 * eliminada (incidenciaId solo es el vínculo cacheado). articuloPaga
 * (porcentajeComputable > 0) se consulta solo si además hay evento de
 * calendario.
 */
export async function obtenerCondicionesVigentes(
  claseId: number,
  tenantId: number,
  db: Db = prisma,
  ahora: Date = new Date()
): Promise<CondicionesVigentes> {
  const clase = await db.claseProgramada.findFirst({
    where: { id: claseId, institucionId: tenantId },
    select: {
      fecha: true,
      estado: true,
      asignacionId: true,
      moduloId: true,
      reemplazos: { where: { activo: true }, take: 1, select: { id: true } },
      modulo:     { select: { hora_hasta: true } },
      asignacion: {
        select: {
          activo: true, deletedAt: true, fecha_fin: true,
          turno: { select: { horaFin: true } },
        },
      },
      incidencia: { select: { activo: true, deletedAt: true, codigarioItemId: true } },
    },
  })
  if (!clase) throw new Error(`ClaseProgramada ${claseId} no encontrada`)

  const horaHasta = clase.modulo?.hora_hasta ?? clase.asignacion?.turno?.horaFin ?? null

  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId, db)
  const periodoOperativoVigente = periodo
    ? clase.fecha >= periodo.fecha_desde && clase.fecha <= periodo.fecha_hasta
    : false

  const eventoCalendario = periodo
    ? await db.calendarioEscolar.findFirst({
        where: {
          institucionId:      tenantId,
          periodoOperativoId: periodo.id,
          fecha:              clase.fecha,
          suspendeClases:     true,
          activo:             true,
          deletedAt:          null,
        },
        select: { id: true },
      })
    : null

  const dia = diaDe(clase.fecha)
  const asignacion = clase.asignacion
  const inactivaSinBaja = !asignacion.activo && asignacion.deletedAt === null
  const asignacionVigente =
    !inactivaSinBaja &&
    rigeEn(dia, horaHasta, asignacion.deletedAt) &&
    (asignacion.fecha_fin === null || dia <= diaDe(asignacion.fecha_fin))

  let moduloVigente = true
  if (clase.moduloId !== null) {
    const versiones = await db.distribucionHoraria.findMany({
      where: {
        asignacionId:         clase.asignacionId,
        fecha_vigencia_desde: { lte: finDelDia(dia) },
        OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: dia } }],
        distribucionModulos:  { some: { moduloHorarioId: clase.moduloId } },
      },
      select: { deletedAt: true },
    })
    moduloVigente = versiones.some(v => rigeEn(dia, horaHasta, v.deletedAt))
  }

  const tieneIncidenciaActiva =
    clase.incidencia !== null && clase.incidencia.activo && clase.incidencia.deletedAt === null

  let articuloPaga: boolean | null = null
  if (eventoCalendario && tieneIncidenciaActiva) {
    const item = await db.codigarioItem.findUnique({
      where:  { id: clase.incidencia!.codigarioItemId },
      select: { porcentajeComputable: true },
    })
    articuloPaga = item ? item.porcentajeComputable > 0 : null
  }

  return {
    estadoActual:            clase.estado,
    asignacionVigente,
    moduloVigente,
    articuloPaga,
    tieneIncidenciaActiva,
    tieneReemplazoAsignado:  clase.reemplazos.length > 0,
    tieneEventoCalendario:   eventoCalendario !== null,
    eventoCalendarioId:      eventoCalendario?.id ?? null,
    periodoOperativoVigente,
    fechaYaPaso:             claseTermino({ fecha: clase.fecha, horaHasta, ahora }),
  }
}

/**
 * Orquestador: resuelve una clase puntual y persiste el resultado si cambió
 * (con db: dentro de una transacción, si se le pasa el cliente transaccional)
 * respecto al estado/causa actual. Incrementa versionResolucion siempre que
 * escribe, para auditoría y como base de lock optimista a futuro.
 *
 * También sincroniza calendarioEscolarId con el resultado real: lo setea
 * cuando la causa final es CALENDARIO_ESCOLAR, y lo limpia en cualquier
 * otro caso.
 *
 * Se re-resuelve SIEMPRE, incluso si ya está DICTADA -- una incidencia
 * cargada después de que una clase quedó dictada (ej: ausencia avisada a
 * media mañana) tiene que poder revertirla a SUSPENDIDA/REEMPLAZADA. Esto
 * es seguro porque fechaYaPaso es monótono (una vez true, sigue siendo
 * true) y pierde contra INCIDENCIA en la tabla de precedencia -- una
 * DICTADA nunca puede volver sola a PROGRAMADA, solo corregirse hacia
 * SUSPENDIDA/REEMPLAZADA si aparece una causa real. FIN_ASIGNACION y
 * CAMBIO_DISTRIBUCION no alcanzan a una DICTADA (ver resolverEstadoYCausa).
 */
export async function resolverClase(
  claseId: number,
  tenantId: number,
  db: Db = prisma,
  // ahora: el instante de la operación (por defecto, el reloj), para que una
  // reconciliación decida todo con el mismo "ahora".
  opciones: { reescribirDictada?: boolean; ahora?: Date } = {}
): Promise<ResultadoResolucion & { actualizada: boolean }> {
  const claseActual = await db.claseProgramada.findFirst({
    where: { id: claseId, institucionId: tenantId },
    select: { estado: true, causa: true, calendarioEscolarId: true },
  })
  if (!claseActual) throw new Error(`ClaseProgramada ${claseId} no encontrada`)

  const vigentes = await obtenerCondicionesVigentes(claseId, tenantId, db, opciones.ahora)
  // reescribirDictada: solo la reconciliación explícita con confirmación
  // ("Editar" retroactivo, decisión 6) evalúa una DICTADA sin la protección
  // contra FIN_ASIGNACION/CAMBIO_DISTRIBUCION.
  const condiciones = opciones.reescribirDictada && vigentes.estadoActual === EstadoClase.DICTADA
    ? { ...vigentes, estadoActual: EstadoClase.PROGRAMADA }
    : vigentes
  const resultado = resolverEstadoYCausa(condiciones)

  const calendarioEscolarIdNuevo = resultado.causa === Causa.CALENDARIO_ESCOLAR
    ? condiciones.eventoCalendarioId
    : null

  const sinCambios =
    resultado.estado === claseActual.estado &&
    resultado.causa  === claseActual.causa &&
    calendarioEscolarIdNuevo === claseActual.calendarioEscolarId

  if (sinCambios) return { ...resultado, actualizada: false }

  await db.claseProgramada.update({
    where: { id: claseId },
    data: {
      estado:               resultado.estado,
      causa:                resultado.causa,
      calendarioEscolarId:  calendarioEscolarIdNuevo,
      versionResolucion:    { increment: 1 },
    },
  })
  return { ...resultado, actualizada: true }
}