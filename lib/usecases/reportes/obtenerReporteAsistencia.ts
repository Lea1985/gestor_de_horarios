import { reporteRepository } from "@/lib/repositories/reporteRepository"
import { RequestContext } from "@/lib/types/context"

export class ReporteAsistenciaInvalidoError extends Error {
  constructor() {
    super("asignacionId, fecha_desde y fecha_hasta son obligatorios")
  }
}

export async function obtenerReporteAsistencia(
  ctx: RequestContext,
  asignacionIdRaw: string | null,
  fechaDesde: string | null,
  fechaHasta: string | null
) {
  if (!asignacionIdRaw || !fechaDesde || !fechaHasta) {
    throw new ReporteAsistenciaInvalidoError()
  }

  const asignacionId = Number(asignacionIdRaw)
  if (isNaN(asignacionId)) {
    throw new ReporteAsistenciaInvalidoError()
  }

  const desde = new Date(fechaDesde)
  const hasta = new Date(fechaHasta)

  const rango = { gte: desde, lte: hasta }

  const [programadas, dictadas, suspendidas, reemplazadas] =
    await reporteRepository.contarAsistencia(
      asignacionId,
      ctx.tenantId,
      rango
    )

  const clases = await reporteRepository.listarClases(
    asignacionId,
    ctx.tenantId,
    rango
  )

  const total = programadas + dictadas + suspendidas + reemplazadas
  console.log({ asignacionId, desde, hasta })
  return {
    asignacionId,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    resumen: {
      total,
      programadas,
      dictadas,
      suspendidas,
      reemplazadas,
      porcentajeDictadas: total > 0 ? Math.round((dictadas / total) * 100) : 0,
      porcentajeSuspendidas: total > 0 ? Math.round((suspendidas / total) * 100) : 0,
    },
    clases,
  }
}