// lib/usecases/comisiones/listarComisiones.ts
import { comisionRepository } from "@/lib/repositories/comisionRepository"
import prisma from "@/lib/prisma"

export async function listarComisiones(tenantId: number, incluirInactivos = false) {
  const comisiones = await comisionRepository.listar(tenantId, incluirInactivos)

  const asignaciones = await prisma.asignacion.findMany({
    where: {
      institucionId: tenantId,
      activo:        true,
      deletedAt:     null,
      comisionId:    { not: null },
    },
    select: { comisionId: true },
  })

  const idsConAsignacion = new Set(asignaciones.map(a => a.comisionId))

  return comisiones.map(c => ({
    ...c,
    tieneAsignacionesActivas: idsConAsignacion.has(c.id),
  }))
}