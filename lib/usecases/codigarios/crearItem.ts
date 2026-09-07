// lib/usecases/codigarios/crearItem.ts
import { codigarioRepository, ItemDuplicadoError, ReactivacionRequeridaError } from "@/lib/repositories/codigarioRepository"
export class DatosItemInvalidosError extends Error {
  constructor() { super("codigo y nombre son obligatorios") }
}
export class CodigarioNoEncontradoError extends Error {
  constructor() { super("Codigario no encontrado") }
}
export class PorcentajeComputableInvalidoError extends Error {
  constructor() { super("porcentajeComputable debe ser un entero entre 0 y 100") }
}
export { ItemDuplicadoError, ReactivacionRequeridaError }
export function validarPorcentajeComputable(valor: unknown): number | undefined {
  if (valor === undefined) return undefined
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0 || valor > 100) {
    throw new PorcentajeComputableInvalidoError()
  }
  return valor
}
export async function crearItem(codigarioId: number, tenantId: number, body: { codigo?: string; nombre?: string; descripcion?: string; porcentajeComputable?: number; confirmarReactivacion?: boolean }) {
  if (!body.codigo || !body.nombre) throw new DatosItemInvalidosError()
  const porcentajeComputable = validarPorcentajeComputable(body.porcentajeComputable)
  const codigario = await codigarioRepository.existeEnTenant(codigarioId, tenantId)
  if (!codigario) throw new CodigarioNoEncontradoError()
  return codigarioRepository.crearItem(codigarioId, tenantId, {
    codigo: body.codigo,
    nombre: body.nombre,
    descripcion: body.descripcion,
    porcentajeComputable,
  }, body.confirmarReactivacion === true)
}