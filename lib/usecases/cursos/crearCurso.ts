// lib/usecases/cursos/crearCurso.ts

import { cursoRepository } from "@/lib/repositories/cursoRepository"

export class DatosCursoInvalidosError extends Error {}

type Input = {
  nombre?: string
  descripcion?: string
}

export async function crearCurso(
  tenantId: number,
  data: Input
) {
  const nombre = data.nombre?.trim()

  if (!nombre) {
    throw new DatosCursoInvalidosError("El nombre es obligatorio")
  }

  return cursoRepository.crear(tenantId, {
    nombre,
    descripcion: data.descripcion?.trim() || undefined,
  })
}