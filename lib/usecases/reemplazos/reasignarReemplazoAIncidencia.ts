// lib/usecases/reemplazos/reasignarReemplazoAIncidencia.ts
import prisma from "@/lib/prisma"
import { resolverClase } from "@/lib/services/resolucionClaseService"
import {
  validarSuperposicionSuplente,
  obtenerAgenteQueSeReemplaza,
} from "./validarSuperposicion"
import { AutoReemplazoError, SuperposicionSuplenteError } from "./crearReemplazo"

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
 *
 * UX-REE-001: antes esta función no aplicaba ninguna de las validaciones
 * de negocio que sí aplica crearReemplazo -- se podía dejar a un suplente
 * cubriéndose a sí mismo, o doblemente reservado en el mismo módulo/
 * fecha, sin ningún error. Se agregan acá las mismas dos que corresponden
 * (auto-reemplazo y superposición), ANTES de la transacción -- así
 * obtenerAgenteQueSeReemplaza todavía ve el reemplazo activo actual
 * (quien de hecho está cubriendo la clase ahora) para comparar contra el
 * suplente nuevo propuesto. La tercera validación de crearReemplazo
 * (reemplazo activo existente) NO aplica acá: tener un reemplazo activo
 * es el punto de partida esperado de este flujo, no un error.
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

  // UX-REE-001
  const agenteQueSeReemplaza = await obtenerAgenteQueSeReemplaza(claseId, asignacionTitularId, tenantId)
  if (agenteQueSeReemplaza === agenteSuplenteId) {
    throw new AutoReemplazoError()
  }
  if (await validarSuperposicionSuplente(claseId, agenteSuplenteId, tenantId)) {
    throw new SuperposicionSuplenteError()
  }

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