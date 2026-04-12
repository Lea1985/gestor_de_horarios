import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export async function eliminarAsignacion(id: number, tenantId: number) {
  const existe = await asignacionRepository.existeEnTenant(id, tenantId)
  if (!existe) return { ok: true, deleted: false }
  return asignacionRepository.eliminar(id)
}