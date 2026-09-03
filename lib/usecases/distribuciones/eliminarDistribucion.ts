// lib/usecases/distribuciones/eliminarDistribucion.ts
import { distribucionRepository, solapa } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import prisma from "@/lib/prisma"
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
 * Si pasa ambas validaciones, se suspenden (no se borran) las clases
 * futuras del tramo dentro del período ACTIVO, igual que antes.
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
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const desde = hoy > periodo.fecha_desde ? hoy : periodo.fecha_desde
  const hasta = periodo.fecha_hasta
  const { suspendidas } = await claseProgramadaService.suspenderNoVigentes({
    institucionId: tenantId,
    asignacionId:  distribucion.asignacion.id,
    unidadId:      distribucion.asignacion.unidadId,
    comisionId:    distribucion.asignacion.comisionId,
    modulosNuevos: [], // la distribución se elimina por completo, nada queda vigente
    desde, hasta,
  })
  await distribucionRepository.eliminar(id, tenantId)
  return { ok: true, deleted: true, clasesSuspendidas: suspendidas }
}