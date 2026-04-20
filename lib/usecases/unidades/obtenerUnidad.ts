//lib/usecases/unidades/obtenerUnidad.ts
import { unidadRepository } from "@/lib/repositories/unidadRepository"
import {  RequestContext as Context } from "@/lib/types/context"

export class UnidadNoEncontradaError extends Error {
  constructor() {
    super("Unidad no encontrada")
  }
}

export async function obtenerUnidad(ctx: Context, id: number) {
  const unidad = await unidadRepository.obtenerPorId(id, ctx.tenantId)

  if (!unidad) {
    throw new UnidadNoEncontradaError()
  }

  return unidad
}