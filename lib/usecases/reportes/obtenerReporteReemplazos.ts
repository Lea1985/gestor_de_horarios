// lib/usecases/reportes/obtenerReporteReemplazos.ts
import { reporteRepository } from "@/lib/repositories/reporteRepository"
import { RequestContext } from "@/lib/types/context"
import { agruparReemplazosPorSuplente } from "@/lib/reporting/transformers/agruparReemplazosPorSuplente"

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

  const reemplazos = await reporteRepository.listarReemplazos(ctx.tenantId, desde, hasta)

  const porSuplente = agruparReemplazosPorSuplente(reemplazos)

  return {
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    total: reemplazos.length,
    porSuplente,
    reemplazos,
  }
}