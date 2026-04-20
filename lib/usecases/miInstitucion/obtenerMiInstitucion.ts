// lib/usecases/miInstitucion/obtenerMiInstitucion.ts
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"

export class InstitucionNoEncontradaError extends Error {
  constructor() { super("Institución no encontrada") }
}

export async function obtenerMiInstitucion(tenantId: number) {
  const institucion = await miInstitucionRepository.obtener(tenantId)
  if (!institucion) throw new InstitucionNoEncontradaError()
  return institucion
}