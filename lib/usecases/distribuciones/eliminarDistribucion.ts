import { distribucionRepository } from "@/lib/repositories/distribucionRepository"

export async function eliminarDistribucion(id: number, tenantId: number) {
  const existe = await distribucionRepository.existeEnTenant(id, tenantId)
  if (!existe) return { ok: true, deleted: false }
  return distribucionRepository.eliminar(id)
}