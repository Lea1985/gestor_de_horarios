// lib/usecases/comisiones/obtenerComision.ts

import { comisionRepository } from "@/lib/repositories/comisionRepository"

export class ComisionNoEncontradaError extends Error {}

export async function obtenerComision(
  id: number,
  tenantId: number
) {
  const comision = await comisionRepository.obtenerPorId(id, tenantId)

  if (!comision) {
    throw new ComisionNoEncontradaError("Comisión no encontrada")
  }

  return comision
}