import { cargoRepository } from "@/lib/repositories/cargoRepository"

export async function eliminarCargo(id: number, tenantId: number) {
  return cargoRepository.eliminar(id, tenantId)
}