//lib/usecases/codigarios/eliminarItem.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export async function eliminarItem(itemId: number, tenantId: number) {
  return codigarioRepository.eliminarItem(itemId)
}