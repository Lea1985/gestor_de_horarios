//lib/usecases/unidades/actualizarUnidad.ts
import { unidadRepository } from "@/lib/repositories/unidadRepository"
import {  RequestContext as Context } from "@/lib/types/context"
import { UnidadNoEncontradaError } from "./obtenerUnidad"

export class SinCamposParaActualizarError extends Error {
  constructor() {
    super("No hay campos para actualizar")
  }
}

type ActualizarUnidadDTO = {
  codigoUnidad?: number
  nombre?: string
  tipo?: string
  estado?: string
}

export async function actualizarUnidad(
  ctx: Context,
  id: number,
  body: ActualizarUnidadDTO
) {
  const existente = await unidadRepository.existe(id, ctx.tenantId)

  if (!existente || existente.deletedAt) {
    throw new UnidadNoEncontradaError()
  }

  const data: any = {}

  if (body.codigoUnidad !== undefined) data.codigoUnidad = body.codigoUnidad
  if (body.nombre !== undefined) data.nombre = body.nombre
  if (body.tipo !== undefined) data.tipo = body.tipo
  if (body.estado !== undefined) data.estado = body.estado

  if (Object.keys(data).length === 0) {
    throw new SinCamposParaActualizarError()
  }

  return unidadRepository.actualizar(id, data)
}