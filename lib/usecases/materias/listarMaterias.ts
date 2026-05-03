import { materiaRepository } from "@/lib/repositories/materiaRepository"

export async function listarMaterias(
  tenantId: number,
  cursoId?: number
) {
  return materiaRepository.listar(tenantId, cursoId)
}