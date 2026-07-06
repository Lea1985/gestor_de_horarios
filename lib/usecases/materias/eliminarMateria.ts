// lib/usecases/materias/eliminarMateria.ts
import { materiaRepository } from "@/lib/repositories/materiaRepository"
import prisma from "@/lib/prisma"

export class MateriaNoEncontradaError extends Error {
  constructor() {
    super("Materia no encontrada")
  }
}

export class MateriaConAsignacionesError extends Error {
  constructor() {
    super("No se puede eliminar la materia porque tiene asignaciones activas")
  }
}

export async function eliminarMateria(
  id: number,
  tenantId: number
) {
  const existe = await materiaRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new MateriaNoEncontradaError()
  }

  const tieneAsignaciones = await prisma.asignacion.count({
    where: {
      materiaId: id,
      institucionId: tenantId,
      activo: true,
      deletedAt: null,
    },
  })

  if (tieneAsignaciones > 0) {
    throw new MateriaConAsignacionesError()
  }

  await materiaRepository.eliminar(id, tenantId)

  return {
    ok: true,
  }
}