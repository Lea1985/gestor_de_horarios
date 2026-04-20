// lib/usecases/modulosHorarios/eliminarModulo.ts

import { moduloHorarioRepository } from "@/lib/repositories/moduloHorarioRepository"

export async function eliminarModulo(id: number, tenantId: number) {
  const existente = await moduloHorarioRepository.existeEnTenant(id, tenantId)
  if (!existente || existente.deletedAt) return { ok: true, deleted: false }
  await moduloHorarioRepository.eliminar(id)
  return { ok: true, deleted: true }
}