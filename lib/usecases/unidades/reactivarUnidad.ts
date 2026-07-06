// lib/usecases/unidades/reactivarUnidad.ts
import { unidadRepository } from "@/lib/repositories/unidadRepository"
import { RequestContext as Context } from "@/lib/types/context"
import { UnidadNoEncontradaError } from "./obtenerUnidad"

export async function reactivarUnidad(ctx: Context, id: number) {
  const result = await unidadRepository.reactivar(id, ctx.tenantId)
  if (!result) throw new UnidadNoEncontradaError()
  return result
}