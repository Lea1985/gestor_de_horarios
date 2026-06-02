// lib/usecases/codigarios/reactivarItem.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class ItemNoEncontradoError extends Error {
  constructor() { super("Item no encontrado") }
}

export async function reactivarItem(itemId: number, tenantId: number) {
  const result = await codigarioRepository.reactivarItem(itemId, tenantId)
  if (!result) throw new ItemNoEncontradoError()
  return result
}