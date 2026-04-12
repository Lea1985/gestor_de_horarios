import { codigarioRepository } from "@/lib/repositories/codigarioRepository"
import { Prisma } from "@prisma/client"

export class CodigarioNoEncontradoError extends Error {
  constructor() { super("Codigario no encontrado") }
}

export class SinCamposError extends Error {
  constructor() { super("No hay campos para actualizar") }
}

export async function actualizarCodigario(id: number, tenantId: number, body: Record<string, unknown>) {
  const existe = await codigarioRepository.existeEnTenant(id, tenantId)
  if (!existe) throw new CodigarioNoEncontradoError()

  const data: Prisma.CodigarioUpdateInput = {}
  if (body.nombre      !== undefined) data.nombre      = (body.nombre as string).trim().toUpperCase()
  if (body.descripcion !== undefined) data.descripcion = body.descripcion as string

  if (Object.keys(data).length === 0) throw new SinCamposError()

  return codigarioRepository.actualizar(id, data)
}