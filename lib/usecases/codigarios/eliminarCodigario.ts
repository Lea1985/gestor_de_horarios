//lib/usecases/codigarios/eliminarCodigario.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class CodigarioNoEncontradoError extends Error {
  constructor() { super("Codigario no encontrado") }
}

export async function eliminarCodigario(id: number, tenantId: number) {
  const existe = await codigarioRepository.existeEnTenant(id, tenantId)
  if (!existe) throw new CodigarioNoEncontradoError()
  await codigarioRepository.eliminar(id)
  return { ok: true }
}