import { codigarioRepository } from "@/lib/repositories/codigarioRepository"
export class CodigarioNoEncontradoError extends Error {
  constructor() {
    super("Codigario no encontrado")
  }
}
export class CodigarioConItemsError extends Error {
  constructor() {
    super("No se puede eliminar: uno o más de sus items fueron utilizados en incidencias ya cerradas")
  }
}
export async function eliminarCodigario(id: number, tenantId: number) {
  const existe = await codigarioRepository.existeEnTenant(id, tenantId)
  if (!existe) {
    throw new CodigarioNoEncontradoError()
  }
  const tieneHistorialCerrado = await codigarioRepository.tieneHistorialCerrado(id, tenantId)
  if (tieneHistorialCerrado) {
    throw new CodigarioConItemsError()
  }
  await codigarioRepository.eliminar(id, tenantId)
  return { ok: true }
}