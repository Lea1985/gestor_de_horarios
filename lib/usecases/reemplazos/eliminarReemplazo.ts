//lib/usecases/reemplazos/eliminarReemplazo.ts
import { reemplazoRepository } from "@/lib/repositories/reemplazoRepository"

export class ReemplazoNoEncontradoError extends Error {
  constructor() { super("Reemplazo no encontrado") }
}

export async function eliminarReemplazo(id: number, tenantId: number) {
  const reemplazo = await reemplazoRepository.existeEnTenant(id, tenantId)
  if (!reemplazo) throw new ReemplazoNoEncontradoError()
  await reemplazoRepository.eliminar(id, reemplazo.claseId)
  return { ok: true, deleted: true }
}