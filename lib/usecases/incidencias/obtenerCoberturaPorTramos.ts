//lib/usecases/incidencias/obtenerCoberturaPorTramos.ts
import prisma from "@/lib/prisma"
import { REEMPLAZO_PAUSADO } from "@/lib/helpers/reemplazoPausado"

export type TramoCobertura = {
  desde:    string
  hasta:    string
  suplente: { id: number; nombre: string; apellido: string } | null
}

export async function obtenerCoberturaPorTramos(
  incidenciaId: number,
  tenantId: number
): Promise<TramoCobertura[]> {
  const incidencia = await prisma.incidencia.findFirst({
    where:  { id: incidenciaId, asignacion: { institucionId: tenantId } },
    select: { asignacionId: true, fecha_desde: true, fecha_hasta: true },
  })
  if (!incidencia) return []

  const clases = await prisma.claseProgramada.findMany({
    where: {
      asignacionId:  incidencia.asignacionId,
      institucionId: tenantId,
      fecha: { gte: incidencia.fecha_desde, lte: incidencia.fecha_hasta },
    },
    orderBy: { fecha: "asc" },
    select: {
      fecha: true,
      reemplazos: {
        // Cada licencia muestra su propio reemplazo (Fase 4, B): en los días
        // de una hija, la padre sigue mostrando a su suplente (en pausa: es
        // quien falta) y la hija a quien lo cubre, o nadie. Los activos sin
        // incidenciaId (anteriores a ese campo) se muestran como antes.
        where: {
          OR: [
            { incidenciaId, activo: true },
            { incidenciaId, ...REEMPLAZO_PAUSADO },
            { incidenciaId: null, activo: true },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          activo:         true,
          incidenciaId:   true,
          agenteSuplente: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  })

  const tramos: TramoCobertura[] = []
  for (const clase of clases) {
    const fecha    = clase.fecha.toISOString().slice(0, 10)
    const propio =
      clase.reemplazos.find(r => r.incidenciaId === incidenciaId && r.activo) ??
      clase.reemplazos.find(r => r.incidenciaId === incidenciaId) ??
      clase.reemplazos[0]
    const suplente = propio?.agenteSuplente ?? null
    const ultimo   = tramos[tramos.length - 1]
    const mismoSuplente =
      ultimo && (ultimo.suplente?.id ?? null) === (suplente?.id ?? null)
    if (mismoSuplente) {
      ultimo.hasta = fecha
    } else {
      tramos.push({ desde: fecha, hasta: fecha, suplente })
    }
  }
  return tramos
}