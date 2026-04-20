//lib/usecases/unidades/listarUnidades.ts
import { unidadRepository } from "@/lib/repositories/unidadRepository"
import {  RequestContext as Context } from "@/lib/types/context"

export async function listarUnidades(ctx: Context) {
  return unidadRepository.listar(ctx.tenantId)
}