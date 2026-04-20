//lib/usecases/clases/obtenerClase.ts
import { claseRepository } from "@/lib/repositories/claseRepository"

export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada") }
}

export async function obtenerClase(id: number, tenantId: number) {
  const clase = await claseRepository.obtenerPorId(id, tenantId)
  if (!clase) throw new ClaseNoEncontradaError()
  return clase
}
