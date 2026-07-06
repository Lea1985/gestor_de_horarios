// lib/usecases/cursos/reactivarCurso.ts
import { cursoRepository } from "@/lib/repositories/cursoRepository"

export class CursoNoEncontradoError extends Error {
  constructor() { super("Curso no encontrado") }
}

export async function reactivarCurso(id: number, tenantId: number) {
  const result = await cursoRepository.reactivar(id, tenantId)
  if (!result) throw new CursoNoEncontradoError()
  return result
}