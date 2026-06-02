// lib/usecases/reportes/obtenerReporteAsistencia.ts
import { reporteRepository } from "@/lib/repositories/reporteRepository"
import { RequestContext } from "@/lib/types/context"

import { calcularResumenEstados }
from "@/lib/reporting/transformers/calcularResumenEstados"

export class ReporteAsistenciaInvalidoError extends Error {
  constructor() {
    super("asignacionId,   fecha_desde y fecha_hasta son obligatorios")
  }
}

export async function obtenerReporteAsistencia(
  ctx: RequestContext,
  asignacionIdRaw: string | null,
  fechaDesde: string | null,
  fechaHasta: string | null
) {

  if (
    !asignacionIdRaw ||
    !fechaDesde ||
    !fechaHasta
  ) {
    throw new ReporteAsistenciaInvalidoError()
  }

  const asignacionId =
    Number(asignacionIdRaw)

  if (isNaN(asignacionId)) {
    throw new ReporteAsistenciaInvalidoError()
  }

  const desde = new Date(fechaDesde)

  const hasta = new Date(fechaHasta)

  const rango = {
    gte: desde,
    lte: hasta,
  }

  const clases =
    await reporteRepository.listarClases(
      asignacionId,
      ctx.tenantId,
      rango
    )

  const resumen =
    calcularResumenEstados(clases)

  console.log({
    asignacionId,
    desde,
    hasta,
  })

  return {

    asignacionId,

    periodo: {
      desde: fechaDesde,
      hasta: fechaHasta,
    },

    resumen: {

      ...resumen,

      porcentajeDictadas:
        resumen.total > 0
          ? Math.round(
              (resumen.dictadas / resumen.total) * 100
            )
          : 0,

      porcentajeSuspendidas:
        resumen.total > 0
          ? Math.round(
              (resumen.suspendidas / resumen.total) * 100
            )
          : 0,
    },

    clases,
  }
}