import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class DatosItemInvalidosError extends Error {
  constructor() { super("codigo y nombre son obligatorios") }
}

export class CodigarioNoEncontradoError extends Error {
  constructor() { super("Codigario no encontrado") }
}

export async function crearItem(codigarioId: number, tenantId: number, body: { codigo?: string; nombre?: string; descripcion?: string }) {
  if (!body.codigo || !body.nombre) throw new DatosItemInvalidosError()

  const codigario = await codigarioRepository.existeEnTenant(codigarioId, tenantId)
  if (!codigario) throw new CodigarioNoEncontradoError()

  return codigarioRepository.crearItem(codigarioId, {
    codigo: body.codigo,
    nombre: body.nombre,
    descripcion: body.descripcion,
  })
}