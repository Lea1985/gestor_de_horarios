// lib/usecases/distribuciones/eliminarDistribucion.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import prisma from "@/lib/prisma"

/**
 * Elimina (soft-delete) una distribución. Si hay período ACTIVO y la
 * distribución tenía clases futuras generadas dentro de ese período, se
 * pide confirmación de reemplazo con el mismo criterio que asignarModulos,
 * y esas clases se SUSPENDEN (causa CAMBIO_DISTRIBUCION), nunca se borran
 * ni se toca DICTADA.
 *
 * Como la distribución se elimina por completo (no hay "distribución nueva"
 * con la que comparar), se usa suspenderNoVigentes con modulosNuevos: []:
 * todo el tramo [desde, hasta] queda marcado como no-vigente.
 *
 * hoy: cualquier fecha >= hoy dentro del período ACTIVO.
 */
export async function eliminarDistribucion(
  id: number,
  tenantId: number,
  body?: { mantenerReemplazo?: boolean }
) {
  const distribucion = await prisma.distribucionHoraria.findFirst({
    where: { id, institucionId: tenantId, deletedAt: null },
    include: { asignacion: { select: { id: true, unidadId: true, comisionId: true } } },
  })
  if (!distribucion) return { ok: true, deleted: false }

  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)

  if (!periodo) {
    // Sin período ACTIVO no hay clases "vivas" que gestionar; solo borramos
    // la distribución.
    await distribucionRepository.eliminar(id, tenantId)
    return { ok: true, deleted: true, clasesSuspendidas: 0 }
  }

  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const desde = hoy > periodo.fecha_desde ? hoy : periodo.fecha_desde
  const hasta = periodo.fecha_hasta

  const tramos = await claseProgramadaService.resolverCoberturaDelTramo({
    asignacionId: distribucion.asignacion.id, desde, hasta,
  })

  if (tramos.length > 0 && body?.mantenerReemplazo === undefined) {
    return { ok: false, requiereConfirmacion: true, tramos }
  }

  // Nota: acá no migramos el reemplazo a ningún lado — la distribución se
  // está eliminando, no hay "clases nuevas" a las que migrarlo. Si el
  // usuario pidió mantenerReemplazo=true sobre una eliminación, no aplica;
  // se lo informamos igual en la respuesta para que el frontend no asuma.
  const { suspendidas } = await claseProgramadaService.suspenderNoVigentes({
    institucionId: tenantId,
    asignacionId:  distribucion.asignacion.id,
    unidadId:      distribucion.asignacion.unidadId,
    comisionId:    distribucion.asignacion.comisionId,
    modulosNuevos: [], // la distribución se elimina por completo, nada queda vigente
    desde, hasta,
  })

  await distribucionRepository.eliminar(id, tenantId)

  return {
    ok: true,
    deleted: true,
    clasesSuspendidas: suspendidas,
    avisoReemplazoNoAplica: body?.mantenerReemplazo === true && tramos.length > 0,
  }
}
