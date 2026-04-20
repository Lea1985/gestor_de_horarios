// lib/usecases/miInstitucion/actualizarMiInstitucion.ts
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"
import { Prisma } from "@prisma/client"

export class SinCamposError extends Error {
  constructor() { super("No hay datos para actualizar") }
}

export class EmailInvalidoError extends Error {
  constructor() { super("Email inválido") }
}

export async function actualizarMiInstitucion(tenantId: number, body: Record<string, unknown>) {
  const data: Prisma.InstitucionUpdateInput = {}

  if (body.nombre        !== undefined) data.nombre        = (body.nombre as string).trim()
  if (body.domicilio     !== undefined) data.domicilio     = body.domicilio as string
  if (body.telefono      !== undefined) data.telefono      = body.telefono as string
  if (body.email         !== undefined) data.email         = body.email as string
  if (body.configuracion !== undefined) data.configuracion = body.configuracion as Prisma.InputJsonValue

  if (Object.keys(data).length === 0) throw new SinCamposError()
  if (data.email && !String(data.email).includes("@")) throw new EmailInvalidoError()

  return miInstitucionRepository.actualizar(tenantId, data)
}