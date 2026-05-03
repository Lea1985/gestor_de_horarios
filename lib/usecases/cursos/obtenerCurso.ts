// lib/usecases/cursos/obtenerCurso.ts

import { cursoRepository } from "@/lib/repositories/cursoRepository"

export class CursoNoEncontradoError extends Error {}

export async function obtenerCurso(
  id: number,
  tenantId: number
) {
  const curso = await cursoRepository.obtenerPorId(id, tenantId)

  if (!curso) {
    throw new CursoNoEncontradoError("Curso no encontrado")
  }

  return curso
}