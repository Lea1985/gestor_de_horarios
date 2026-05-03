import { cargoRepository } from "@/lib/repositories/cargoRepository"

export async function obtenerCargo(id: number, tenantId: number) {
  return cargoRepository.obtenerPorId(id, tenantId)
}