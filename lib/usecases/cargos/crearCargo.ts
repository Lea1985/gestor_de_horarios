import { cargoRepository } from "@/lib/repositories/cargoRepository"

type CrearCargoInput = {
  numeroCargo?: number
  tipoCargo?: string
  materiaId?: number
  unidadId?: number
  comisionId?: number
  observacion?: string
}

export async function crearCargo(tenantId: number, data: CrearCargoInput) {
  return cargoRepository.crear(tenantId, data)
}