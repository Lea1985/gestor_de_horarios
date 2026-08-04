// lib/services/resolucionClaseService.ts
//
// Motor de Resolución: determina estado y causa final de una ClaseProgramada
// evaluando todas las condiciones vigentes. Es el único módulo autorizado a
// decidir el estado final de una clase (ver invariantes de Resolución en el
// documento de arquitectura).
//
// CAMBIO_DISTRIBUCION es un atajo aparte: lo decide claseProgramadaService
// .suspenderNoVigentes() directamente, sin pasar por acá, porque ese caso
// ya está probado en producción (asignarModulos, nuevaVersionDistribucion,
// eliminarDistribucion). Este motor cubre las demás causas: INCIDENCIA,
// PERIODO_OPERATIVO, CALENDARIO_ESCOLAR, NINGUNA/DICTADA.
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "@/lib/prisma"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import type { CondicionesVigentes, ResultadoResolucion } from "@/lib/types/claseProgramada"

/**
 * Función pura: aplica la tabla de precedencia definida en el documento de
 * arquitectura. No toca la base ni el reloj -- recibe "fechaYaPaso" ya
 * calculado, para que siga siendo fácil de testear con tablas de casos.
 *
 * Orden de precedencia (mayor a menor):
 *   1. INCIDENCIA           -> REEMPLAZADA (si tiene reemplazo) o SUSPENDIDA
 *   2. PERIODO_OPERATIVO    -> SUSPENDIDA (el período ya no cubre esa fecha)
 *   3. CALENDARIO_ESCOLAR   -> SUSPENDIDA
 *   4. Si nada de lo anterior aplica y la fecha ya pasó -> DICTADA
 *   5. NINGUNA              -> PROGRAMADA
 *
 * NOTA: no evalúa CAMBIO_DISTRIBUCION -- ver comentario de cabecera del
 * archivo.
 */
export function resolverEstadoYCausa(condiciones: CondicionesVigentes): ResultadoResolucion {
  if (condiciones.tieneIncidenciaActiva) {
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
 * fechaYaPaso: fecha de la clase <= hoy. Es lo único que decide DICTADA
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
      incidenciaId: true,
      reemplazos: { where: { activo: true }, take: 1, select: { id: true } },
    },
  })
  if (!clase) throw new Error(`ClaseProgramada ${claseId} no encontrada`)

  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)

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

  return {
    tieneIncidenciaActiva:   clase.incidenciaId !== null,
    tieneReemplazoAsignado:  clase.reemplazos.length > 0,
    tieneEventoCalendario:   eventoCalendario !== null,
    eventoCalendarioId:      eventoCalendario?.id ?? null,
    periodoOperativoVigente,
    fechaYaPaso:             clase.fecha <= hoy,
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
 * SUSPENDIDA/REEMPLAZADA si aparece una causa real.
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