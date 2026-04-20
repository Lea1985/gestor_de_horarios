import { reemplazoRepository } from "@/lib/repositories/reemplazoRepository"

export class ReemplazoNoEncontradoError extends Error {
  constructor() { super("Reemplazo no encontrado") }
}

export async function obtenerReemplazo(id: number, tenantId: number) {
  const reemplazo = await reemplazoRepository.obtenerPorId(id, tenantId)
  if (!reemplazo) throw new ReemplazoNoEncontradoError()
  return reemplazo
}