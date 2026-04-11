import { agenteRepository } from "@/lib/repositories/agenteRepository"

export async function listarAgentes(tenantId: number) {
  return agenteRepository.listar(tenantId)
}