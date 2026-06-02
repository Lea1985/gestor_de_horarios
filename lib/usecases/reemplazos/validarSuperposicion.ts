// lib/usecases/reemplazos/validarSuperposicion.ts
import prisma from "@/lib/prisma"

/**
 * Verifica si el agente suplente ya tiene una ClaseProgramada
 * en el mismo módulo y fecha que la clase que se quiere cubrir.
 *
 * Retorna true si hay superposición.
 */
export async function validarSuperposicionSuplente(
  claseId: number,
  agenteSuplenteId: number,
  tenantId: number
): Promise<boolean> {

  // Clase que se quiere cubrir
  const clase = await prisma.claseProgramada.findFirst({
    where: {
      id: claseId,
      institucionId: tenantId,
    },

    select: {
      fecha: true,
      moduloId: true,
    },
  })

  if (!clase) return false

  // Buscar asignaciones activas del agente suplente a través de TitularAsignacion
  const titularidades = await prisma.titularAsignacion.findMany({
    where: {
      agenteId: agenteSuplenteId,
      institucionId: tenantId,
      activo: true,
      fecha_hasta: null, // Titular actual
    },
    select: {
      asignacionId: true,
    },
  })

  const asignacionIds = titularidades.map(t => t.asignacionId)

  if (asignacionIds.length === 0) return false

  // Verificar si ya tiene clase en ese módulo y fecha
  const conflicto = await prisma.claseProgramada.findFirst({
    where: {
      asignacionId: {
        in: asignacionIds,
      },

      institucionId: tenantId,
      fecha: clase.fecha,

      ...(clase.moduloId
        ? { moduloId: clase.moduloId }
        : {}),
    },

    select: {
      id: true,
    },
  })

  return conflicto !== null
}