// lib/usecases/comisiones/reactivarComision.ts
import { comisionRepository } from "@/lib/repositories/comisionRepository"

export class ComisionNoEncontradaError extends Error {
  constructor() { super("Comisión no encontrada") }
}

export async function reactivarComision(id: number, tenantId: number) {
  const result = await comisionRepository.reactivar(id, tenantId)
  if (!result) throw new ComisionNoEncontradaError()
  return result
}
