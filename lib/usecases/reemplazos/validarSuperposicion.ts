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
/**
 * Determina qué agente está siendo reemplazado en esta clase puntual:
 * el agente del último Reemplazo registrado para esa clase (activo o
 * no, el más reciente por id) -- porque ese es, en los hechos, quien
 * dejó de cubrirla justo antes de este nuevo reemplazo. Si todavía no
 * hay ningún Reemplazo para la clase, es el titular vigente en la
 * fecha de esa clase.
 *
 * Se usa para impedir que un agente quede asignado como su propio
 * reemplazante (bug real encontrado 16/08/2026: un suplente que
 * también faltó terminó reemplazándose a sí mismo).
 */
export async function obtenerAgenteQueSeReemplaza(
  claseId: number,
  asignacionTitularId: number,
  tenantId: number
): Promise<number | null> {
  const ultimoReemplazo = await prisma.reemplazo.findFirst({
    where: {
      claseId,
      clase: { institucionId: tenantId },
    },
    orderBy: { id: "desc" },
    select: { agenteSuplenteId: true },
  })
  if (ultimoReemplazo) return ultimoReemplazo.agenteSuplenteId
  const clase = await prisma.claseProgramada.findFirst({
    where: { id: claseId, institucionId: tenantId },
    select: { fecha: true },
  })
  if (!clase) return null
  const titularidad = await prisma.titularAsignacion.findFirst({
    where: {
      asignacionId: asignacionTitularId,
      fecha_desde: { lte: clase.fecha },
      OR: [
        { fecha_hasta: null },
        { fecha_hasta: { gte: clase.fecha } },
      ],
    },
    select: { agenteId: true },
  })
  return titularidad?.agenteId ?? null
}