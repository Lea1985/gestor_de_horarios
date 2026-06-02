//lib/usecases/codigarios/obtenerCodigario.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class CodigarioNoEncontradoError extends Error {
  constructor() { super("Codigario no encontrado") }
}

export async function obtenerCodigario(id: number, tenantId: number, incluirInactivos = false) {
  const codigario = await codigarioRepository.obtenerPorId(id, tenantId, incluirInactivos)
  if (!codigario) throw new CodigarioNoEncontradoError()
  return codigario
}