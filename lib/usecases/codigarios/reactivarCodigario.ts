// lib/usecases/codigarios/reactivarCodigario.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class CodigarioNoEncontradoError extends Error {
  constructor() { super("Codigario no encontrado") }
}

export async function reactivarCodigario(id: number, tenantId: number) {
  const result = await codigarioRepository.reactivar(id, tenantId)
  if (!result) throw new CodigarioNoEncontradoError()
  return result
}