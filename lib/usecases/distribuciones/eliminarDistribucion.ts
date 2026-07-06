// lib/usecases/distribuciones/eliminarDistribucion.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import prisma from "@/lib/prisma"

/**
 * Elimina (soft-delete) una distribución. Si hay período ACTIVO y la
 * distribución tenía clases futuras generadas dentro de ese período, se
 * pide confirmación de reemplazo con el mismo criterio que asignarModulos,
 * y se eliminan esas clases (nunca DICTADA).
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
    include: { asignacion: { select: { id: true } } },
  })
  if (!distribucion) return { ok: true, deleted: false }

  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)

  if (!periodo) {
    // Sin período ACTIVO no hay clases "vivas" que gestionar; solo borramos
    // la distribución.
    await distribucionRepository.eliminar(id, tenantId)
    return { ok: true, deleted: true, clasesEliminadas: 0 }
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
  const { eliminadas } = await claseProgramadaService.eliminarEnRango({
    asignacionId: distribucion.asignacion.id, desde, hasta,
  })

  await distribucionRepository.eliminar(id, tenantId)

  return {
    ok: true,
    deleted: true,
    clasesEliminadas: eliminadas,
    avisoReemplazoNoAplica: body?.mantenerReemplazo === true && tramos.length > 0,
  }
}
