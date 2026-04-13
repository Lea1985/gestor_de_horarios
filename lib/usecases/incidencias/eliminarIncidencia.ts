import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export async function eliminarIncidencia(id: number, tenantId: number) {
  const existe = await incidenciaRepository.existeEnTenant(id, tenantId)
  if (!existe || existe.deletedAt) return { ok: true, deleted: false }
  await incidenciaRepository.eliminar(id)
  return { ok: true, deleted: true }
}