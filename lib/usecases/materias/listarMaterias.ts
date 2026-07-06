// lib/usecases/materias/listarMaterias.ts
import { materiaRepository } from "@/lib/repositories/materiaRepository"
import prisma from "@/lib/prisma"

export async function listarMaterias(
  tenantId: number,
  cursoId?: number,
  incluirInactivos = false
) {
  const materias = await materiaRepository.listar(tenantId, cursoId, incluirInactivos)

  const asignaciones = await prisma.asignacion.findMany({
    where: {
      institucionId: tenantId,
      activo:        true,
      deletedAt:     null,
      materiaId:     { not: null },
    },
    select: { materiaId: true },
  })

  const idsConAsignacion = new Set(asignaciones.map(a => a.materiaId))

  return materias.map(m => ({
    ...m,
    tieneAsignacionesActivas: idsConAsignacion.has(m.id),
  }))
}