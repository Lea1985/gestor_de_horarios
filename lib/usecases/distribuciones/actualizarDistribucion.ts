// lib/usecases/distribuciones/actualizarDistribucion.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { Prisma } from "@prisma/client"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}
export class SinCamposError extends Error {
  constructor() { super("No hay campos para actualizar") }
}

/**
 * Actualiza campos administrativos de la distribución (version, estado,
 * fecha_vigencia_hasta). No toca ClaseProgramada.
 *
 * El cambio de módulos (que SÍ regenera y elimina clases, con el flujo de
 * "preguntar por el reemplazo si un suplente único cubre todo el tramo")
 * sigue viviendo en asignarModulos.ts — es la operación real que dispara
 * la regla de negocio de "modificar distribución" descrita por el usuario.
 */
export async function actualizarDistribucion(id: number, tenantId: number, body: Record<string, unknown>) {
  const existe = await distribucionRepository.existeEnTenant(id, tenantId)
  if (!existe) throw new DistribucionNoEncontradaError()

  const data: Prisma.DistribucionHorariaUpdateInput = {}
  if (body.version              !== undefined) data.version              = body.version as number
  if (body.estado               !== undefined) data.estado               = body.estado as never
  if (body.fecha_vigencia_hasta !== undefined) {
    data.fecha_vigencia_hasta = body.fecha_vigencia_hasta ? new Date(body.fecha_vigencia_hasta as string) : null
  }
  // fecha_vigencia_desde NO se edita acá a propósito: cambiarla implica
  // reubicar clases ya generadas, que es responsabilidad de asignarModulos
  // (o de nuevaVersionDistribucion para crear una vigencia nueva).

  if (Object.keys(data).length === 0) throw new SinCamposError()

  return distribucionRepository.actualizar(id, tenantId, data)
}
