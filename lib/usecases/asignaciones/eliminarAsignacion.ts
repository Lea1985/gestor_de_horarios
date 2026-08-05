// lib/usecases/asignaciones/eliminarAsignacion.ts
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import prisma from "@/lib/prisma"

export class TieneIncidenciasActivasError extends Error {
  constructor() { super("No se puede eliminar una asignación con incidencias activas") }
}
export class TieneReemplazosActivosError extends Error {
  constructor() { super("No se puede eliminar una asignación con reemplazos activos") }
}

export async function eliminarAsignacion(id: number, tenantId: number) {
  const existe = await asignacionRepository.existeEnTenant(id, tenantId)
  if (!existe) {
    return { ok: true, deleted: false }
  }

  // Regla 1: no eliminar si tiene incidencias activas
  const tieneIncidencias = await prisma.incidencia.count({
    where: {
      asignacionId: id,
      activo:       true,
      deletedAt:    null,
    },
  })
  if (tieneIncidencias > 0) throw new TieneIncidenciasActivasError()

  // Regla 2: no eliminar si tiene reemplazos activos
  const tieneReemplazos = await prisma.reemplazo.count({
    where: {
      activo:    true,
      deletedAt: null,
      clase: {
        asignacionId: id,
      },
    },
  })
  if (tieneReemplazos > 0) throw new TieneReemplazosActivosError()

  // softDelete cierra el titular vigente en la misma transacción
  await asignacionRepository.softDelete(id, tenantId)

  // Suspender las clases futuras -- ya no hay asignación que las respalde.
  // Sin incidencias/reemplazos activos posibles acá (bloqueado arriba),
  // así que es un bulk-update directo, sin pasar por el motor clase por clase.
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const { suspendidas } = await claseProgramadaService.suspenderPorFinAsignacion({
    institucionId: tenantId,
    asignacionId:  id,
    desde:         hoy,
  })

  return { ok: true, deleted: true, clasesSuspendidas: suspendidas }
}