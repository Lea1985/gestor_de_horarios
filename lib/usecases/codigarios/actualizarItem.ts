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
export class ImpactoRetroactivoRequiereConfirmacionError extends Error {
  cantidadIncidencias: number
  constructor(cantidadIncidencias: number) {
    super(`Este cambio recalcula el pago de ${cantidadIncidencias} incidencia(s) ya cerradas`)
    this.cantidadIncidencias = cantidadIncidencias
  }
}
export { PorcentajeComputableInvalidoError }
export async function actualizarItem(itemId: number, tenantId: number, body: Record<string, unknown>) {
  const existente = await codigarioRepository.obtenerItem(itemId, tenantId)
  if (!existente) throw new ItemNoEncontradoError()
  const data: Prisma.CodigarioItemUpdateInput = {}
  if (body.codigo      !== undefined) data.codigo      = body.codigo as string
  if (body.nombre      !== undefined) data.nombre      = body.nombre as string
  if (body.descripcion !== undefined) data.descripcion = body.descripcion as string
  const porcentajeComputable = validarPorcentajeComputable(body.porcentajeComputable)
  if (porcentajeComputable !== undefined) data.porcentajeComputable = porcentajeComputable
  if (Object.keys(data).length === 0) throw new SinCamposError()
  // UX-COD-001: si el % Computable realmente cambia (no se reenvía el mismo
  // valor) y hay incidencias ya cerradas usando este item, exigir
  // confirmación explícita antes de aplicar — el cambio recalcula en vivo
  // el pago de esas incidencias históricas.
  const cambiaPorcentaje = porcentajeComputable !== undefined && porcentajeComputable !== existente.porcentajeComputable
  if (cambiaPorcentaje && body.confirmarImpactoRetroactivo !== true) {
    const cantidadIncidencias = await codigarioRepository.contarIncidenciasCerradas(itemId, tenantId)
    if (cantidadIncidencias > 0) {
      throw new ImpactoRetroactivoRequiereConfirmacionError(cantidadIncidencias)
    }
  }
  return codigarioRepository.actualizarItem(
    itemId,
    tenantId,
    data
  )
}