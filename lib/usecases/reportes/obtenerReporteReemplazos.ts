import { reporteRepository } from "@/lib/repositories/reporteRepository"
import { RequestContext } from "@/lib/types/context"

export class ReporteReemplazosInvalidoError extends Error {
  constructor() {
    super("fecha_desde y fecha_hasta son obligatorios")
  }
}

export async function obtenerReporteReemplazos(
  ctx: RequestContext,
  fechaDesde: string | null,
  fechaHasta: string | null
) {
  if (!fechaDesde || !fechaHasta) {
    throw new ReporteReemplazosInvalidoError()
  }

  const desde = new Date(fechaDesde)
  const hasta = new Date(fechaHasta)

  const reemplazos = await reporteRepository.listarReemplazos(
    ctx.tenantId,
    desde,
    hasta
  )

  // 🔥 lógica de negocio: agrupación
  const porSuplente: Record<
    number,
    { agente: unknown; cantidad: number }
  > = {}

  for (const r of reemplazos) {
    const id = r.asignacionSuplenteId

    if (!porSuplente[id]) {
      porSuplente[id] = {
        agente: r.asignacionSuplente.agente,
        cantidad: 0,
      }
    }

    porSuplente[id].cantidad++
  }

  return {
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    total: reemplazos.length,
    porSuplente: Object.values(porSuplente).sort(
      (a, b) => b.cantidad - a.cantidad
    ),
    reemplazos,
  }
}