// lib/usecases/unidades/eliminarUnidad.ts
import { unidadRepository } from "@/lib/repositories/unidadRepository"
import { RequestContext as Context } from "@/lib/types/context"
import prisma from "@/lib/prisma"

export class TieneAsignacionesActivasError extends Error {
  constructor() { super("No se puede eliminar una unidad con asignaciones activas") }
}

export async function eliminarUnidad(ctx: Context, id: number) {
  const existente = await unidadRepository.existe(id, ctx.tenantId)

  if (!existente || existente.deletedAt) {
    return { ok: true, deleted: false }
  }

  // Regla: no eliminar si tiene asignaciones activas
  const tieneAsignaciones = await prisma.asignacion.count({
    where: {
      unidadId:      id,
      institucionId: ctx.tenantId,
      activo:        true,
      deletedAt:     null,
    },
  })
  if (tieneAsignaciones > 0) throw new TieneAsignacionesActivasError()

  await unidadRepository.softDelete(id, ctx.tenantId)

  return { ok: true, deleted: true }
}