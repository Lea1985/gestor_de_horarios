import { moduloRepository } from "@/lib/repositories/moduloRepository"

export async function eliminarModulo(id: number, tenantId: number) {
  const existe = await moduloRepository.existeEnTenant(id, tenantId)
  if (!existe || existe.deletedAt) return { ok: true, deleted: false }
  return moduloRepository.eliminar(id)
}