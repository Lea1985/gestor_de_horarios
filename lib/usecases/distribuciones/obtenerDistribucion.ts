import { distribucionRepository } from "@/lib/repositories/distribucionRepository"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}

export async function obtenerDistribucion(id: number, tenantId: number) {
  const distribucion = await distribucionRepository.obtenerPorId(id, tenantId)
  if (!distribucion) throw new DistribucionNoEncontradaError()
  return distribucion
}