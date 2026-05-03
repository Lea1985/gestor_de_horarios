import { materiaRepository } from "@/lib/repositories/materiaRepository"

export class DatosMateriaInvalidosError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export async function crearMateria(
  tenantId: number,
  body: any
) {
  const nombre = body?.nombre?.trim()
  const cursoId = body?.cursoId

  if (!nombre) {
    throw new DatosMateriaInvalidosError("El nombre es obligatorio")
  }

  if (!cursoId) {
    throw new DatosMateriaInvalidosError("El curso es obligatorio")
  }

  return materiaRepository.crear(tenantId, nombre, cursoId)
}