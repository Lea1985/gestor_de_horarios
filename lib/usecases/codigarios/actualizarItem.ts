//lib/usecases/codigarios/actualizarItem.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"
import { Prisma } from "@prisma/client"
import { validarPorcentajeComputable, PorcentajeComputableInvalidoError } from "./crearItem"

export class ItemNoEncontradoError extends Error {
  constructor() { super("Item no encontrado") }
}
export class SinCamposError extends Error {
  constructor() { super("No hay campos para actualizar") }
}

export { PorcentajeComputableInvalidoError }

export async function actualizarItem(itemId: number, tenantId: number, body: Record<string, unknown>) {
  const existe = await codigarioRepository.existeItem(itemId, tenantId)
  if (!existe) throw new ItemNoEncontradoError()
  const data: Prisma.CodigarioItemUpdateInput = {}
  if (body.codigo      !== undefined) data.codigo      = body.codigo as string
  if (body.nombre      !== undefined) data.nombre      = body.nombre as string
  if (body.descripcion !== undefined) data.descripcion = body.descripcion as string
  const porcentajeComputable = validarPorcentajeComputable(body.porcentajeComputable)
  if (porcentajeComputable !== undefined) data.porcentajeComputable = porcentajeComputable
  if (Object.keys(data).length === 0) throw new SinCamposError()
return codigarioRepository.actualizarItem(
  itemId,
  tenantId,
  data
)}