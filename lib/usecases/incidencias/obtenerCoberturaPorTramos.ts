//lib/usecases/incidencias/obtenerCoberturaPorTramos.ts
import prisma from "@/lib/prisma"

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
        // Sin filtro por incidenciaId a propósito: dentro del rango de la
        // incidencia raíz, el reemplazo activo puede pertenecer a una
        // incidencia hija (ej: el suplente también se ausentó y se
        // reasignó la cobertura) -- igual corresponde mostrarlo acá, es
        // parte de la misma cadena. El sistema no permite incidencias
        // superpuestas sobre la misma asignación salvo padre-hijo, así
        // que cualquier activo en este rango pertenece a esta cadena.
        where:   { activo: true },
        take:    1,
        orderBy: { createdAt: "desc" },
        select: {
          agenteSuplente: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  })

  const tramos: TramoCobertura[] = []
  for (const clase of clases) {
    const fecha    = clase.fecha.toISOString().slice(0, 10)
    const suplente = clase.reemplazos[0]?.agenteSuplente ?? null
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