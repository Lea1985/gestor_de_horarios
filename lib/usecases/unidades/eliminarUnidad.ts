//lib/usecases/unidades/eliminarUnidad.ts
import { unidadRepository } from "@/lib/repositories/unidadRepository"
import { RequestContext as Context } from "@/lib/types/context"

export async function eliminarUnidad(ctx: Context, id: number) {
  const existente = await unidadRepository.existe(id, ctx.tenantId)

  // No existe o ya estaba eliminado → idempotencia
  if (!existente || existente.deletedAt) {
    return {
      ok: true,
      deleted: false,
    }
  }

  await unidadRepository.softDelete(id)

  return {
    ok: true,
    deleted: true,
  }
}