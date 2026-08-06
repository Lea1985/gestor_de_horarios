//lib/usecases/asignaciones/obtenerAsignacion.ts
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

export async function obtenerAsignacion(id: number, tenantId: number, incluirEliminados = false) {
  const asignacion = await asignacionRepository.obtenerPorId(id, tenantId, incluirEliminados)
  if (!asignacion) throw new AsignacionNoEncontradaError()
  return asignacion
}