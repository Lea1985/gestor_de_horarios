// ─────────────────────────────────────────────────────────────────────────────
// lib/usecases/asignaciones/eliminarAsignacion.ts
// ─────────────────────────────────────────────────────────────────────────────

import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export async function eliminarAsignacion(id: number, tenantId: number) {
  const existe = await asignacionRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    return { ok: true, deleted: false }
  }

  // softDelete en el repo cierra el titular vigente en la misma transacción.
  await asignacionRepository.softDelete(id, tenantId)

  return { ok: true, deleted: true }
}
