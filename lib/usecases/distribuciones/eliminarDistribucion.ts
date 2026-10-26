// lib/usecases/distribuciones/eliminarDistribucion.ts
import { distribucionRepository, solapa } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { reconciliarAsignacion, OPCIONES_TRANSACCION, RequiereConfirmacionError } from "@/lib/services/reconciliacionService"
import prisma from "@/lib/prisma"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"
export class DistribucionNoActivaError extends Error {
  constructor() { super("No se puede eliminar una distribución que ya no está activa.") }
}
export class TieneIncidenciasError extends Error {
  constructor() { super("Esta distribución tiene incidencias asociadas y forma parte del historial de la asignación -- no se puede eliminar.") }
}
/**
 * Elimina (soft-delete) una distribución.
 *
 * UX-DIS-011/151 (reglas de negocio definidas con el usuario 2026-09-03):
 * solo se puede eliminar una versión que (a) está ACTIVO -- una cerrada o
 * vencida ya es historial, ver distribucionRepository.cerrarVencidas -- y
 * (b) nunca tuvo ninguna Incidencia (activa o eliminada, no importa) con
 * fechas solapadas a su propio tramo [fecha_vigencia_desde,
 * fecha_vigencia_hasta]. Si la tuvo, esa versión "se efectivizó" y pasa a
 * ser parte del historial permanente de la asignación -- no se puede
 * volver a eliminar aunque se reactive después.
 *
 * En este sistema un Reemplazo siempre viene de una Incidencia (no existen
 * reemplazos sueltos, confirmado con el usuario) -- así que este chequeo
 * ya cubre también lo que antes resolvía el flujo de dos pasos con
 * ModalEliminarConReemplazo/requiereConfirmacion. Ese flujo se elimina
 * por completo: ya no aplica, el bloqueo ahora es directo y anticipado
 * (ver puedeEliminar/motivoBloqueoEliminar en listarDistribuciones.ts y
 * obtenerDistribucion.ts, que la UI usa para deshabilitar el botón antes
 * de intentar nada).
 *
 * Si pasa ambas validaciones, la baja y la reconciliación de la asignación
 * desde hoy (el día local de la baja) van en una única transacción: las
 * clases de hoy en adelante de esa versión pasan a CAMBIO_DISTRIBUCION (o a
 * lo que corresponda si otra versión las cubre); las anteriores no se tocan.
 * No hay reemplazos que anular: una versión con incidencias no se elimina.
 */
export async function eliminarDistribucion(id: number, tenantId: number) {
  const distribucion = await prisma.distribucionHoraria.findFirst({
    where: { id, institucionId: tenantId, deletedAt: null },
    include: { asignacion: { select: { id: true, unidadId: true, comisionId: true } } },
  })
  if (!distribucion) return { ok: true, deleted: false }
  if (distribucion.estado !== "ACTIVO") throw new DistribucionNoActivaError()
  const dDesde = new Date(distribucion.fecha_vigencia_desde)
  const dHasta = distribucion.fecha_vigencia_hasta ? new Date(distribucion.fecha_vigencia_hasta) : new Date("9999-12-31")
  const incidencias = await prisma.incidencia.findMany({
    where: { asignacionId: distribucion.asignacion.id },
    select: { fecha_desde: true, fecha_hasta: true },
  })
  const tieneIncidencias = incidencias.some(inc =>
    solapa(dDesde, dHasta, new Date(inc.fecha_desde), new Date(inc.fecha_hasta))
  )
  if (tieneIncidencias) throw new TieneIncidenciasError()
  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  if (!periodo) {
    // Sin período ACTIVO no hay clases "vivas" que gestionar; solo borramos
    // la distribución.
    await distribucionRepository.eliminar(id, tenantId)
    return { ok: true, deleted: true, clasesSuspendidas: 0 }
  }
  // Si la baja cambiara clases ya dictadas, se revierte y se devuelve el
  // aviso, igual que en las demás operaciones (la ruta responde 409).
  try {
    const r = await prisma.$transaction(async (tx) => {
      await distribucionRepository.eliminar(id, tenantId, tx)
      return reconciliarAsignacion({
        tenantId,
        asignacionId: distribucion.asignacion.id,
        desde:        hoyLocal(),
      }, tx)
    }, OPCIONES_TRANSACCION)
    return { ok: true, deleted: true, clasesSuspendidas: r.clasesActualizadas }
  } catch (error) {
    if (error instanceof RequiereConfirmacionError) {
      return { ok: false, requiereConfirmacion: true, aviso: error.aviso }
    }
    throw error
  }
}