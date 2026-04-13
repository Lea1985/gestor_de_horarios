import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export class IncidenciaNoEncontradaError extends Error {
  constructor() { super("Incidencia no encontrada") }
}

export async function obtenerIncidencia(id: number, tenantId: number) {
  const incidencia = await incidenciaRepository.obtenerPorId(id, tenantId)
  if (!incidencia) throw new IncidenciaNoEncontradaError()
  return incidencia
}