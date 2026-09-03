//lib/usecases/distribuciones/obtenerDistribucion.ts
import { distribucionRepository, solapa } from "@/lib/repositories/distribucionRepository"
import prisma from "@/lib/prisma"
export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}
export async function obtenerDistribucion(id: number, tenantId: number) {
  // UX-DIS-011/151: mismo cierre automático por tráfico que en listarDistribuciones.
  await distribucionRepository.cerrarVencidas(tenantId)
  // UX-DIS-008: se incluyen eliminadas a propósito -- la pantalla de
  // detalle necesita poder cargar una distribución eliminada para mostrar
  // el badge "Eliminada" + botón Reactivar, igual que ya hace
  // obtenerAsignacion para Asignaciones.
  const distribucion = await distribucionRepository.obtenerPorId(id, tenantId, true)
  if (!distribucion) throw new DistribucionNoEncontradaError()
  // UX-DIS-011/151: mismo cálculo de bloqueo que listarDistribuciones,
  // para esta distribución puntual. No aplica (queda todo en null/false)
  // si ya está eliminada -- no tiene sentido preguntar si "se puede
  // eliminar" algo que ya está eliminado.
  let puedeEliminar = false
  let motivoBloqueoEliminar: string | null = null
  if (!distribucion.deletedAt) {
    if (distribucion.estado !== "ACTIVO") {
      motivoBloqueoEliminar = "Esta versión ya no está activa."
    } else {
      const dDesde = new Date(distribucion.fecha_vigencia_desde)
      const dHasta = distribucion.fecha_vigencia_hasta ? new Date(distribucion.fecha_vigencia_hasta) : new Date("9999-12-31")
      const incidencias = await prisma.incidencia.findMany({
        where: { asignacionId: distribucion.asignacionId },
        select: { fecha_desde: true, fecha_hasta: true },
      })
      const tieneIncidencias = incidencias.some(inc =>
        solapa(dDesde, dHasta, new Date(inc.fecha_desde), new Date(inc.fecha_hasta))
      )
      motivoBloqueoEliminar = tieneIncidencias ? "Tiene incidencias asociadas — forma parte del historial." : null
    }
    puedeEliminar = motivoBloqueoEliminar === null
  }
  return { ...distribucion, puedeEliminar, motivoBloqueoEliminar }
}