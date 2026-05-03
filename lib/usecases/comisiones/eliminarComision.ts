// lib/usecases/comisiones/eliminarComision.ts

import { comisionRepository } from "@/lib/repositories/comisionRepository"

export class ComisionNoEncontradaError extends Error {}

export async function eliminarComision(
  id: number,
  tenantId: number
) {
  const existe = await comisionRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new ComisionNoEncontradaError("Comisión no encontrada")
  }

  await comisionRepository.eliminar(id)

  return { ok: true }
}