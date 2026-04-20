//lib/usecases/incidencias/actualizarIncidencia.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export class IncidenciaNoEncontradaError extends Error {
  constructor() { super("Incidencia no encontrada") }
}

export class RangoFechasInvalidoError extends Error {
  constructor() { super("Rango de fechas inválido") }
}

export class CodigarioItemNoValidoError extends Error {
  constructor() { super("Código de incidencia no válido para esta institución") }
}

export class SuperposicionError extends Error {
  constructor(public readonly conflicto: { id: number; fecha_desde: Date; fecha_hasta: Date }) {
    super("Conflicto de fechas con otra incidencia")
  }
}

export async function actualizarIncidencia(id: number, tenantId: number, body: Record<string, unknown>) {
  const incidencia = await incidenciaRepository.obtenerPorId(id, tenantId)
  if (!incidencia) throw new IncidenciaNoEncontradaError()

  const nuevaDesde = body.fecha_desde ? new Date(body.fecha_desde as string) : incidencia.fecha_desde
  const nuevaHasta = body.fecha_hasta ? new Date(body.fecha_hasta as string) : incidencia.fecha_hasta
  if (nuevaDesde > nuevaHasta) throw new RangoFechasInvalidoError()

  const codigarioItemId = (body.codigarioItemId as number) ?? incidencia.codigarioItemId

  if (body.codigarioItemId && body.codigarioItemId !== incidencia.codigarioItemId) {
    if (!await incidenciaRepository.verificarCodigarioItem(codigarioItemId, tenantId)) {
      throw new CodigarioItemNoValidoError()
    }
  }

  const conflicto = await incidenciaRepository.verificarSuperposicion(incidencia.asignacionId, nuevaDesde, nuevaHasta, id)
  if (conflicto) throw new SuperposicionError(conflicto)

  return incidenciaRepository.actualizar(id, {
    fecha_desde:     nuevaDesde,
    fecha_hasta:     nuevaHasta,
    codigarioItemId,
    observacion:     body.observacion as string | undefined,
  })
}