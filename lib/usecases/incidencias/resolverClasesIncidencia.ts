// lib/usecases/incidencias/resolverClasesIncidencia.ts
import prisma from "@/lib/prisma"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import { resolverClase } from "@/lib/services/resolucionClaseService"
import { pausarReemplazosDeOtrasLicencias } from "@/lib/helpers/reemplazoPausado"

export async function resolverClasesIncidencia(incidenciaId: number, tenantId: number) {
  const incidencia = await prisma.incidencia.findFirst({
    where: { id: incidenciaId, deletedAt: null, asignacion: { institucionId: tenantId } },
    select: { fecha_desde: true, fecha_hasta: true, asignacionId: true, incidenciaPadreId: true },
  })
  if (!incidencia) return { count: 0 }

  const { ids } = await claseProgramadaService.vincularIncidencia({
    asignacionId: incidencia.asignacionId,
    incidenciaId,
    desde: incidencia.fecha_desde,
    hasta: incidencia.fecha_hasta,
  })
  if (ids.length === 0) return { count: 0 }

  // Una licencia hija toma clases que ya cubría el suplente de la padre: ese
  // reemplazo queda en pausa (el suplente es quien falta).
  if (incidencia.incidenciaPadreId) {
    await pausarReemplazosDeOtrasLicencias(ids, incidenciaId)
  }

  let count = 0
  for (const id of ids) {
    const r = await resolverClase(id, tenantId)
    if (r.actualizada) count++
  }
  return { count }
}