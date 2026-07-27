// lib/usecases/reemplazos/eliminarReemplazo.ts
import { reemplazoRepository } from "@/lib/repositories/reemplazoRepository"
import { resolverClase } from "@/lib/services/resolucionClaseService"
import prisma from "@/lib/prisma"

export class ReemplazoNoEncontradoError extends Error {
  constructor() { super("Reemplazo no encontrado") }
}
export class ReemplazoConIncidenciaHijaError extends Error {
  constructor() { super("No se puede quitar el reemplazo porque para esta fecha hay una incidencia hija activa que reemplaza al suplente") }
}

export async function eliminarReemplazo(id: number, tenantId: number) {
  const reemplazo = await reemplazoRepository.existeEnTenant(id, tenantId)
  if (!reemplazo) throw new ReemplazoNoEncontradoError()

  const clase = await prisma.claseProgramada.findFirst({
    where:  { id: reemplazo.claseId, institucionId: tenantId },
    select: { incidenciaId: true, fecha: true },
  })

  // Bloqueamos solo si la incidencia DUEÑA ACTUAL de esta clase puntual
  // tiene una hija activa que cubre justo esta fecha — es decir, hay un
  // reemplazo posterior encadenado sobre este mismo día.
  if (clase?.incidenciaId) {
    const hijaActiva = await prisma.incidencia.findFirst({
      where: {
        incidenciaPadreId: clase.incidenciaId,
        activo:            true,
        deletedAt:         null,
        fecha_desde:       { lte: clase.fecha },
        fecha_hasta:       { gte: clase.fecha },
      },
      select: { id: true },
    })

    if (hijaActiva) throw new ReemplazoConIncidenciaHijaError()
  }

  await reemplazoRepository.eliminar(id, reemplazo.claseId, tenantId)

  await resolverClase(reemplazo.claseId, tenantId)

  return { ok: true, deleted: true }
}