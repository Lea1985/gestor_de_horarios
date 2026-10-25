// lib/services/resolucionClaseService.ts
//
// Motor de Resolución: determina estado y causa final de una ClaseProgramada
// evaluando todas las condiciones vigentes. Es el único módulo autorizado a
// decidir el estado final de una clase (ver invariantes de Resolución en el
// documento de arquitectura).
//
// Cubre todas las causas: FIN_ASIGNACION, CAMBIO_DISTRIBUCION, INCIDENCIA,
// PERIODO_OPERATIVO, CALENDARIO_ESCOLAR y NINGUNA/DICTADA. Los atajos en
// lote de claseProgramadaService (suspenderNoVigentes,
// suspenderPorFinAsignacion) siguen escribiendo FIN_ASIGNACION y
// CAMBIO_DISTRIBUCION directo hasta la reconciliación de la Fase 3; el motor
// llega al mismo resultado cuando vuelve a resolver esas clases.
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "@/lib/prisma"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseTermino } from "@/lib/helpers/fechaInstitucion"
import type { CondicionesVigentes, ResultadoResolucion } from "@/lib/types/claseProgramada"

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
 */
export async function obtenerCondicionesVigentes(
  claseId: number,
  tenantId: number
): Promise<CondicionesVigentes> {
  const clase = await prisma.claseProgramada.findFirst({
    where: { id: claseId, institucionId: tenantId },
    select: {
      fecha: true,
      estado: true,
      incidenciaId: true,
      reemplazos: { where: { activo: true }, take: 1, select: { id: true } },
      modulo:     { select: { hora_hasta: true } },
      asignacion: { select: { turno: { select: { horaFin: true } } } },
    },
  })
  if (!clase) throw new Error(`ClaseProgramada ${claseId} no encontrada`)

  const ahora = new Date()
  const horaHasta = clase.modulo?.hora_hasta ?? clase.asignacion?.turno?.horaFin ?? null

  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  const periodoOperativoVigente = periodo
    ? clase.fecha >= periodo.fecha_desde && clase.fecha <= periodo.fecha_hasta
    : false

  const eventoCalendario = periodo
    ? await prisma.calendarioEscolar.findFirst({
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

  // asignacionVigente, moduloVigente y articuloPaga todavía no se consultan:
  // valores neutros que reproducen el comportamiento anterior.
  return {
    estadoActual:            clase.estado,
    asignacionVigente:       true,
    moduloVigente:           true,
    articuloPaga:            null,
    tieneIncidenciaActiva:   clase.incidenciaId !== null,
    tieneReemplazoAsignado:  clase.reemplazos.length > 0,
    tieneEventoCalendario:   eventoCalendario !== null,
    eventoCalendarioId:      eventoCalendario?.id ?? null,
    periodoOperativoVigente,
    fechaYaPaso:             claseTermino({ fecha: clase.fecha, horaHasta, ahora }),
  }
}

/**
 * Orquestador: resuelve una clase puntual y persiste el resultado si cambió
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
  tenantId: number
): Promise<ResultadoResolucion & { actualizada: boolean }> {
  const claseActual = await prisma.claseProgramada.findFirst({
    where: { id: claseId, institucionId: tenantId },
    select: { estado: true, causa: true, calendarioEscolarId: true },
  })
  if (!claseActual) throw new Error(`ClaseProgramada ${claseId} no encontrada`)

  const condiciones = await obtenerCondicionesVigentes(claseId, tenantId)
  const resultado = resolverEstadoYCausa(condiciones)

  const calendarioEscolarIdNuevo = resultado.causa === Causa.CALENDARIO_ESCOLAR
    ? condiciones.eventoCalendarioId
    : null

  const sinCambios =
    resultado.estado === claseActual.estado &&
    resultado.causa  === claseActual.causa &&
    calendarioEscolarIdNuevo === claseActual.calendarioEscolarId

  if (sinCambios) return { ...resultado, actualizada: false }

  await prisma.claseProgramada.update({
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