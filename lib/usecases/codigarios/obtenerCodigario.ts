import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class CodigarioNoEncontradoError extends Error {
  constructor() { super("Codigario no encontrado") }
}

export async function obtenerCodigario(id: number, tenantId: number) {
  const codigario = await codigarioRepository.obtenerPorId(id, tenantId)
  if (!codigario) throw new CodigarioNoEncontradoError()
  return codigario
}