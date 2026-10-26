// lib/usecases/asignaciones/eliminarAsignacion.ts
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"
import { reconciliarAsignacion, OPCIONES_TRANSACCION, RequiereConfirmacionError } from "@/lib/services/reconciliacionService"
import prisma from "@/lib/prisma"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"

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

  // La baja (softDelete cierra también el titular vigente) y la
  // reconciliación van en una única transacción. La baja rige desde el día
  // local de su deletedAt (hoy), inclusive: las clases de hoy en adelante
  // pasan a FIN_ASIGNACION y las anteriores no se tocan. Sin incidencias ni
  // reemplazos activos posibles acá (bloqueado arriba). Si aun así la baja
  // cambiara clases ya dictadas, se revierte y se devuelve el aviso, igual
  // que en las demás operaciones (la ruta responde 409).
  try {
    const r = await prisma.$transaction(async (tx) => {
      await asignacionRepository.softDelete(id, tenantId, tx)
      return reconciliarAsignacion({ tenantId, asignacionId: id, desde: hoyLocal() }, tx)
    }, OPCIONES_TRANSACCION)
    return { ok: true, deleted: true, clasesSuspendidas: r.clasesActualizadas }
  } catch (error) {
    if (error instanceof RequiereConfirmacionError) {
      return { ok: false, requiereConfirmacion: true, aviso: error.aviso }
    }
    throw error
  }
}