//lib/usecases/clases/obtenerClase.ts
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"

export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada") }
}

export async function obtenerClase(id: number, tenantId: number) {
  const clase = await claseProgramadaRepository.obtenerPorId(id, tenantId)
  if (!clase) throw new ClaseNoEncontradaError()
  return clase
}
