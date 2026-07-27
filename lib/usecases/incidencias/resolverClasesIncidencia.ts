// lib/usecases/incidencias/resolverClasesIncidencia.ts
import prisma from "@/lib/prisma"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import { resolverClase } from "@/lib/services/resolucionClaseService"

export async function resolverClasesIncidencia(incidenciaId: number, tenantId: number) {
  const incidencia = await prisma.incidencia.findFirst({
    where: { id: incidenciaId, deletedAt: null, asignacion: { institucionId: tenantId } },
    select: { fecha_desde: true, fecha_hasta: true, asignacionId: true },
  })
  if (!incidencia) return { count: 0 }

  const { ids } = await claseProgramadaService.vincularIncidencia({
    asignacionId: incidencia.asignacionId,
    incidenciaId,
    desde: incidencia.fecha_desde,
    hasta: incidencia.fecha_hasta,
  })
  if (ids.length === 0) return { count: 0 }

  let count = 0
  for (const id of ids) {
    const r = await resolverClase(id, tenantId)
    if (r.actualizada) count++
  }
  return { count }
}