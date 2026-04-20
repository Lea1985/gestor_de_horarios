import { reporteRepository } from "@/lib/repositories/reporteRepository"
import { RequestContext } from "@/lib/types/context"

export class ReporteUnidadInvalidoError extends Error {
  constructor() {
    super("fecha_desde y fecha_hasta son obligatorios")
  }
}

export class UnidadNoEncontradaError extends Error {
  constructor() {
    super("Unidad no encontrada")
  }
}

export async function obtenerReporteUnidad(
  ctx: RequestContext,
  unidadId: number,
  fechaDesde: string | null,
  fechaHasta: string | null
) {
  if (!fechaDesde || !fechaHasta) {
    throw new ReporteUnidadInvalidoError()
  }

  const unidad = await reporteRepository.obtenerUnidad(
    unidadId,
    ctx.tenantId
  )

  if (!unidad) {
    throw new UnidadNoEncontradaError()
  }

  const desde = new Date(fechaDesde)
  const hasta = new Date(fechaHasta)

  const rango = { gte: desde, lte: hasta }

  const clases = await reporteRepository.listarClasesPorUnidad(
    unidadId,
    ctx.tenantId,
    rango
  )

  // 🔥 lógica de negocio: agregación
  const resumen = clases.reduce((acc, c) => {
    acc[c.estado] = (acc[c.estado] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    unidad,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    resumen: {
      total: clases.length,
      programadas: resumen.PROGRAMADA ?? 0,
      dictadas: resumen.DICTADA ?? 0,
      suspendidas: resumen.SUSPENDIDA ?? 0,
      reemplazadas: resumen.REEMPLAZADA ?? 0,
    },
    clases,
  }
}