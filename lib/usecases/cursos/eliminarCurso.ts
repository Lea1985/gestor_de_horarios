// lib/usecases/cursos/eliminarCurso.ts

import { cursoRepository } from "@/lib/repositories/cursoRepository"

export class CursoNoEncontradoError extends Error {}

export async function eliminarCurso(
  id: number,
  tenantId: number
) {
  const existe = await cursoRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new CursoNoEncontradoError("Curso no encontrado")
  }

  await cursoRepository.eliminar(id)

  return { ok: true }
}