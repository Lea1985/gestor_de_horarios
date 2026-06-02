//lib/usecases/incidencias/listarIncidencias.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export async function listarIncidencias(tenantId: number, asignacionId?: number, incluirEliminadas = false) {
  return incidenciaRepository.listar(tenantId, asignacionId, incluirEliminadas)
}