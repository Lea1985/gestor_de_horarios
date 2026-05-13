import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

export async function reactivarAsignacion(id: number, tenantId: number) {
  const existe = await asignacionRepository.existeEliminada(id, tenantId)
  if (!existe) throw new AsignacionNoEncontradaError()

  await asignacionRepository.reactivar(id, tenantId)
  return { ok: true }
}