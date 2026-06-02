import { reporteRepository } from "@/lib/repositories/reporteRepository"
import { RequestContext } from "@/lib/types/context"

export class ReporteAgenteInvalidoError extends Error {
  constructor() {
    super("fecha_desde y fecha_hasta son obligatorios")
  }
}
export class AgenteNoEncontradoError extends Error {}

export async function obtenerReporteAgente(
  ctx: RequestContext,
  agenteId: number,
  fechaDesde: string,
  fechaHasta: string
) {
  if (!fechaDesde || !fechaHasta) {
    throw new ReporteAgenteInvalidoError()
  }

  const agente = await reporteRepository.obtenerAgente(agenteId, ctx.tenantId)
  if (!agente) {
    throw new AgenteNoEncontradoError()
  }

  const desde = new Date(fechaDesde)
  const hasta = new Date(fechaHasta)
  const rango = { gte: desde, lte: hasta }

  const asignaciones = await reporteRepository.listarAsignaciones(agenteId, ctx.tenantId)
  const asignacionIds = asignaciones.map(a => a.id)

  // ✅ NUEVO: usamos agregación directa en la base de datos (más rápido)
  const resumenClases = await reporteRepository.obtenerResumenClasesPorAsignaciones(asignacionIds, rango)

  const incidencias = await reporteRepository.listarIncidencias(asignacionIds, desde, hasta)

  const [reemplazosComoTitular, reemplazosComoSuplente] =
    await reporteRepository.contarReemplazos(asignacionIds, rango)

  const total = resumenClases.PROGRAMADA + resumenClases.DICTADA + resumenClases.SUSPENDIDA + resumenClases.REEMPLAZADA

  return {
    agente: agente.agente,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    asignaciones,
    resumen: {
      total,
      programadas: resumenClases.PROGRAMADA,
      dictadas: resumenClases.DICTADA,
      suspendidas: resumenClases.SUSPENDIDA,
      reemplazadas: resumenClases.REEMPLAZADA,
      porcentajeDictadas: total > 0 ? Math.round((resumenClases.DICTADA / total) * 100) : 0,
      porcentajeSuspendidas: total > 0 ? Math.round((resumenClases.SUSPENDIDA / total) * 100) : 0,
      reemplazosComoTitular,
      reemplazosComoSuplente,
    },
    incidencias,
  }
}