import { cargoRepository } from "@/lib/repositories/cargoRepository"

export async function listarCargos(tenantId: number) {
  return cargoRepository.listar(tenantId)
}