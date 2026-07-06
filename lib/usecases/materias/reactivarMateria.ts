// lib/usecases/materias/reactivarMateria.ts
import { materiaRepository } from "@/lib/repositories/materiaRepository"

export class MateriaNoEncontradaError extends Error {
  constructor() { super("Materia no encontrada") }
}

export async function reactivarMateria(id: number, tenantId: number) {
  const result = await materiaRepository.reactivar(id, tenantId)
  if (!result) throw new MateriaNoEncontradaError()
  return result
}