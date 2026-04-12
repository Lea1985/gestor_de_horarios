import { distribucionRepository } from "@/lib/repositories/distribucionRepository"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}

export class ModulosInvalidosError extends Error {
  constructor() { super("Uno o más módulos no pertenecen a esta institución") }
}

export class FormatoModulosInvalidoError extends Error {
  constructor() { super("Se espera un array de IDs de módulos") }
}

export async function asignarModulos(distribucionId: number, tenantId: number, body: { modulos?: unknown }) {
  if (!Array.isArray(body.modulos)) throw new FormatoModulosInvalidoError()

  const distribucion = await distribucionRepository.existeEnTenant(distribucionId, tenantId)
  if (!distribucion) throw new DistribucionNoEncontradaError()

  const result = await distribucionRepository.asignarModulos(distribucionId, tenantId, body.modulos as number[])
  if (!result) throw new ModulosInvalidosError()

  return { ok: true, total: result.length, data: result }
}