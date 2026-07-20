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
// PERIODO_OPERATIVO, CALENDARIO_ESCOLAR, NINGUNA.

import { EstadoClase, Causa } from "@prisma/client"
import prisma from "@/lib/prisma"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import type { CondicionesVigentes, ResultadoResolucion } from "@/lib/types/claseProgramada"

/**
 * Función pura: aplica la tabla de precedencia definida en el documento de
 * arquitectura. No toca la base. Fácil de testear con tablas de casos.
 *
 * Orden de precedencia (mayor a menor):
 *   1. INCIDENCIA           -> REEMPLAZADA (si tiene reemplazo) o SUSPENDIDA
 *   2. PERIODO_OPERATIVO    -> SUSPENDIDA (el período ya no cubre esa fecha)
 *   3. CALENDARIO_ESCOLAR   -> SUSPENDIDA
 *   4. NINGUNA              -> PROGRAMADA
 *
 * NOTA: no evalúa CAMBIO_DISTRIBUCION -- ver comentario de cabecera del
 * archivo. Si en algún momento se unifica todo en este motor, acá es donde
 * se agregaría ese escalón (entre INCIDENCIA y PERIODO_OPERATIVO, según el
 * orden ya acordado en el documento).
 */
export function resolverEstadoYCausa(condiciones: CondicionesVigentes): ResultadoResolucion {
  if (condiciones.tieneIncidenciaActiva) {
    return {
      estado: condiciones.tieneReemplazoAsignado ? EstadoClase.REEMPLAZADA : EstadoClase.SUSPENDIDA,
      causa:  Causa.INCIDENCIA,
    }
  }

  if (!condiciones.periodoOperativoVigente) {
    return { estado: EstadoClase.SUSPENDIDA, causa: Causa.PERIODO_OPERATIVO }
  }

  if (condiciones.tieneEventoCalendario) {
    return { estado: EstadoClase.SUSPENDIDA, causa: Causa.CALENDARIO_ESCOLAR }
  }

  return { estado: EstadoClase.PROGRAMADA, causa: Causa.NINGUNA }
}

/**
 * Junta el estado real de una ClaseProgramada puntual desde la base y arma
 * el objeto CondicionesVigentes que consume resolverEstadoYCausa.
 *
 * SUPUESTOS A CONFIRMAR (no verificados contra el repositorio real):
 *  - periodoOperativoRepository.obtenerVigente(tenantId) devuelve el período
 *    con fecha_desde/fecha_hasta, igual que en los usecases ya migrados.
 *  - "vigente" para una clase puntual = su fecha cae dentro de
 *    [fecha_desde, fecha_hasta] del período vigente. Si el período vigente
 *    cambió y esa fecha quedó afuera, periodoOperativoVigente da false.
 *  - tieneEventoCalendario se lee directo de calendarioEscolarId (FK ya
 *    seteada en la clase) -- no se vuelve a consultar CalendarioEscolar.
 *    Si ese campo no se está seteando todavía en ningún flujo real, esta
 *    condición va a dar siempre false hasta que se complete esa parte.
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
      calendarioEscolarId: true,
      reemplazos: { where: { activo: true }, take: 1, select: { id: true } },
    },
  })
  if (!clase) throw new Error(`ClaseProgramada ${claseId} no encontrada`)

  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  const periodoOperativoVigente = periodo
    ? clase.fecha >= periodo.fecha_desde && clase.fecha <= periodo.fecha_hasta
    : false

  return {
    tieneIncidenciaActiva:   clase.incidenciaId !== null,
    tieneReemplazoAsignado:  clase.reemplazos.length > 0,
    tieneEventoCalendario:   clase.calendarioEscolarId !== null,
    periodoOperativoVigente,
  }
}

/**
 * Orquestador: resuelve una clase puntual y persiste el resultado si cambió
 * respecto al estado/causa actual. Incrementa versionResolucion siempre que
 * escribe, para auditoría y como base de lock optimista a futuro.
 *
 * No toca DICTADA -- una clase dictada es historia, no se re-resuelve.
 */
export async function resolverClase(
  claseId: number,
  tenantId: number
): Promise<ResultadoResolucion & { actualizada: boolean }> {
  const claseActual = await prisma.claseProgramada.findFirst({
    where: { id: claseId, institucionId: tenantId },
    select: { estado: true, causa: true },
  })
  if (!claseActual) throw new Error(`ClaseProgramada ${claseId} no encontrada`)

  if (claseActual.estado === EstadoClase.DICTADA) {
    return { estado: claseActual.estado, causa: claseActual.causa, actualizada: false }
  }

  const condiciones = await obtenerCondicionesVigentes(claseId, tenantId)
  const resultado = resolverEstadoYCausa(condiciones)

  const sinCambios = resultado.estado === claseActual.estado && resultado.causa === claseActual.causa
  if (sinCambios) return { ...resultado, actualizada: false }

  await prisma.claseProgramada.update({
    where: { id: claseId },
    data: {
      estado: resultado.estado,
      causa:  resultado.causa,
      versionResolucion: { increment: 1 },
    },
  })

  return { ...resultado, actualizada: true }
}
