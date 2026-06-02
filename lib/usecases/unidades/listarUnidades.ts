// lib/usecases/unidades/listarUnidades.ts
import { unidadRepository } from "@/lib/repositories/unidadRepository"
import { RequestContext as Context } from "@/lib/types/context"
import prisma from "@/lib/prisma"

export async function listarUnidades(ctx: Context) {
  const unidades = await unidadRepository.listar(ctx.tenantId)

  const asignaciones = await prisma.asignacion.findMany({
    where: {
      institucionId: ctx.tenantId,
      activo:        true,
      deletedAt:     null,
    },
    select: { unidadId: true },
  })

  const idsConAsignacion = new Set(asignaciones.map(a => a.unidadId))

  return unidades.map(u => ({
    ...u,
    tieneAsignacionesActivas: idsConAsignacion.has(u.id),
  }))
}