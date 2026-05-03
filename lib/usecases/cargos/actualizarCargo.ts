import { cargoRepository } from "@/lib/repositories/cargoRepository"
import { Prisma } from "@prisma/client"

export async function actualizarCargo(
  id: number,
  tenantId: number,
  data: Prisma.CargoUpdateInput
) {
  return cargoRepository.actualizar(id, tenantId, data)
}