// lib/usecases/codigarios/eliminarItem.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"
export class ItemConHistorialCerradoError extends Error {
  constructor() {
    super("No se puede eliminar: este item fue utilizado en una o más incidencias ya cerradas")
  }
}
export async function eliminarItem(itemId: number, tenantId: number) {
  const tieneHistorialCerrado = await codigarioRepository.itemTieneHistorialCerrado(itemId, tenantId)
  if (tieneHistorialCerrado) {
    throw new ItemConHistorialCerradoError()
  }
  return codigarioRepository.eliminarItem(itemId, tenantId)
}