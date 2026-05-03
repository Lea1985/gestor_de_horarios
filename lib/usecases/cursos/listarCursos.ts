// lib/usecases/cursos/listarCursos.ts

import { cursoRepository } from "@/lib/repositories/cursoRepository"

export async function listarCursos(tenantId: number) {
  return cursoRepository.listar(tenantId)
}