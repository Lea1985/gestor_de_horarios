import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class ItemNoEncontradoError extends Error {
  constructor() { super("Item no encontrado") }
}

export async function eliminarItem(itemId: number, tenantId: number) {
  const result = await codigarioRepository.eliminarItem(itemId, tenantId)
  if (!result.deleted) throw new ItemNoEncontradoError()
  return result
}