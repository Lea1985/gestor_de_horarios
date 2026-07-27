// lib/usecases/reemplazos/reasignarReemplazoAIncidencia.ts
import prisma from "@/lib/prisma"
import { resolverClase } from "@/lib/services/resolucionClaseService"

export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada") }
}
export class IncidenciaNoValidaError extends Error {
  constructor() { super("Incidencia no encontrada o no pertenece a esta institución") }
}

/**
 * Cuando una incidencia hija (ej: ausencia del suplente) toma el control
 * de una clase que ya tenía reemplazo bajo la incidencia padre:
 *  1. Desactiva el reemplazo anterior (si existe)
 *  2. Mueve la clase a la nueva incidencia (clase.incidenciaId = nuevaIncidenciaId)
 *  3. Crea el nuevo reemplazo
 * El estado/causa final lo decide resolverClase después de la transacción,
 * no se hardcodea acá.
 */
export async function reasignarReemplazoAIncidencia(
  tenantId: number,
  data: {
    claseId:             number
    nuevaIncidenciaId:   number
    asignacionTitularId: number
    agenteSuplenteId:    number
    observacion?:        string
  }
) {
  const { claseId, nuevaIncidenciaId, asignacionTitularId, agenteSuplenteId, observacion } = data

  const clase = await prisma.claseProgramada.findFirst({
    where:  { id: claseId, institucionId: tenantId },
    select: { id: true },
  })
  if (!clase) throw new ClaseNoEncontradaError()

  const incidencia = await prisma.incidencia.findFirst({
    where: {
      id: nuevaIncidenciaId,
      deletedAt: null,
      asignacion: { institucionId: tenantId },
    },
    select: { id: true },
  })
  if (!incidencia) throw new IncidenciaNoValidaError()

  const nuevoReemplazo = await prisma.$transaction(async (tx) => {
    await tx.reemplazo.updateMany({
      where: { claseId, activo: true },
      data:  { activo: false, deletedAt: new Date() },
    })

    await tx.claseProgramada.update({
      where: { id: claseId },
      data:  { incidenciaId: nuevaIncidenciaId },
    })

    return tx.reemplazo.create({
      data: {
        claseId,
        asignacionTitularId,
        agenteSuplenteId,
        incidenciaId: nuevaIncidenciaId,
        observacion,
        activo: true,
      },
    })
  })

  await resolverClase(claseId, tenantId)

  return nuevoReemplazo
}