// lib/usecases/reemplazos/validarSuperposicion.ts
import prisma from "@/lib/prisma"

export async function validarSuperposicionSuplente(
  claseId: number,
  agenteSuplenteId: number,
  tenantId: number
): Promise<boolean> {
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
  const titularidades = await prisma.titularAsignacion.findMany({
    where: {
      agenteId: agenteSuplenteId,
      institucionId: tenantId,
      activo: true,
      fecha_hasta: null,
    },
    select: {
      asignacionId: true,
    },
  })
  const asignacionIds = titularidades.map(t => t.asignacionId)
  if (asignacionIds.length === 0) return false
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
 * el agente del Reemplazo ACTIVO registrado para esa clase (si existe)
 * -- porque ese es, en los hechos, quien la está cubriendo ahora mismo.
 * Si no hay ningún Reemplazo activo (nunca se asignó, o el anterior se
 * quitó), es el titular vigente en la fecha de esa clase.
 *
 * IMPORTANTE: solo mira reemplazos ACTIVOS, no cualquiera histórico --
 * si mirara también los soft-deleted (activo:false), volver a agregar
 * al mismo suplente después de quitarlo lo comparaba contra sí mismo y
 * disparaba un falso "auto-reemplazo" (bug encontrado 24/08/2026).
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
      activo: true,
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