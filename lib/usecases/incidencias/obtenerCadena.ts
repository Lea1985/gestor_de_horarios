import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export class IncidenciaNoEncontradaError extends Error {
  constructor() { super("Incidencia no encontrada") }
}

export async function obtenerCadena(id: number, tenantId: number) {
  const existe = await incidenciaRepository.obtenerPorId(id, tenantId)
  if (!existe) throw new IncidenciaNoEncontradaError()
  return incidenciaRepository.cadena(id)
}