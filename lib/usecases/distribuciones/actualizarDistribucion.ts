//lib/usecases/distribuciones/actualizarDistribucion.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { Prisma } from "@prisma/client"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}

export class SinCamposError extends Error {
  constructor() { super("No hay campos para actualizar") }
}

export async function actualizarDistribucion(id: number, tenantId: number, body: Record<string, unknown>) {
  const existe = await distribucionRepository.existeEnTenant(id, tenantId)
  if (!existe) throw new DistribucionNoEncontradaError()

  const data: Prisma.DistribucionHorariaUpdateInput = {}
  if (body.version              !== undefined) data.version              = body.version as number
  if (body.estado               !== undefined) data.estado               = body.estado as never
  if (body.fecha_vigencia_desde !== undefined) data.fecha_vigencia_desde = new Date(body.fecha_vigencia_desde as string)
  if (body.fecha_vigencia_hasta !== undefined) {
    data.fecha_vigencia_hasta = body.fecha_vigencia_hasta ? new Date(body.fecha_vigencia_hasta as string) : null
  }

  if (Object.keys(data).length === 0) throw new SinCamposError()

  return distribucionRepository.actualizar(id, data)
}