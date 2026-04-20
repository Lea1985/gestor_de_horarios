import { reporteRepository } from "@/lib/repositories/reporteRepository"
import { RequestContext } from "@/lib/types/context"

export class ReporteAgenteInvalidoError extends Error {}
export class AgenteNoEncontradoError extends Error {}

export async function obtenerReporteAgente(
  ctx: RequestContext,
  agenteId: number,
  fechaDesde: string,
  fechaHasta: string
) {
  if (!fechaDesde || !fechaHasta) {
    throw new ReporteAgenteInvalidoError("fecha_desde y fecha_hasta son obligatorios")
  }

  const agente = await reporteRepository.obtenerAgente(agenteId, ctx.tenantId)

  if (!agente) {
    throw new AgenteNoEncontradoError()
  }

  const desde = new Date(fechaDesde)
  const hasta = new Date(fechaHasta)

  const asignaciones = await reporteRepository.listarAsignaciones(
    agenteId,
    ctx.tenantId
  )

  const asignacionIds = asignaciones.map(a => a.id)

  const rango = { gte: desde, lte: hasta }

  const [programadas, dictadas, suspendidas, reemplazadas] =
    await reporteRepository.contarClases(asignacionIds, rango)

  const incidencias = await reporteRepository.listarIncidencias(
    asignacionIds,
    desde,
    hasta
  )

  const [reemplazosComoTitular, reemplazosComoSuplente] =
    await reporteRepository.contarReemplazos(asignacionIds, rango)

  const total = programadas + dictadas + suspendidas + reemplazadas

  return {
    agente: agente.agente,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    asignaciones,
    resumen: {
      total,
      programadas,
      dictadas,
      suspendidas,
      reemplazadas,
      porcentajeDictadas: total > 0 ? Math.round((dictadas / total) * 100) : 0,
      porcentajeSuspendidas: total > 0 ? Math.round((suspendidas / total) * 100) : 0,
      reemplazosComoTitular,
      reemplazosComoSuplente,
    },
    incidencias,
  }
}