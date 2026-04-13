import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export async function listarIncidencias(tenantId: number, asignacionId?: number) {
  return incidenciaRepository.listar(tenantId, asignacionId)
}