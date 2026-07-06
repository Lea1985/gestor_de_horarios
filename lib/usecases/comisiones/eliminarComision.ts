// lib/usecases/comisiones/eliminarComision.ts

import { comisionRepository } from "@/lib/repositories/comisionRepository"

export class ComisionNoEncontradaError extends Error {
  constructor() {
    super("Comisión no encontrada")
  }
}

export async function eliminarComision(
  id: number,
  tenantId: number
) {
  const existe = await comisionRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new ComisionNoEncontradaError()
  }

  // FIX: el repository requiere (id, tenantId)
  await comisionRepository.eliminar(id, tenantId)

  return { ok: true }
}