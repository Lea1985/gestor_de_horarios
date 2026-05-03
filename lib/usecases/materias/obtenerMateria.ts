// lib/usecases/materias/obtenerMateria.ts
import { materiaRepository } from "@/lib/repositories/materiaRepository"

export class MateriaNoEncontradaError extends Error {
  constructor() {
    super("Materia no encontrada")
  }
}

export async function obtenerMateria(
  id: number,
  tenantId: number
) {
  const materia = await materiaRepository.obtenerPorId(id, tenantId)

  if (!materia) {
    throw new MateriaNoEncontradaError()
  }

  return materia
}