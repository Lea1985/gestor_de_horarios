// lib/usecases/incidencias/actualizarIncidencia.ts

import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export class IncidenciaNoEncontradaError extends Error {
  constructor() {
    super("Incidencia no encontrada")
  }
}

export class RangoFechasInvalidoError extends Error {
  constructor() {
    super("Rango de fechas inválido")
  }
}

export class CodigarioItemNoValidoError extends Error {
  constructor() {
    super("Código de incidencia no válido para esta institución")
  }
}

export class SuperposicionError extends Error {
  constructor(
    public readonly conflicto: {
      id: number
      fecha_desde: Date
      fecha_hasta: Date
    }
  ) {
    super("Conflicto de fechas con otra incidencia")
  }
}

export async function actualizarIncidencia(
  id: number,
  tenantId: number,
  body: Record<string, unknown>
) {
  const incidencia = await incidenciaRepository.obtenerPorId(id, tenantId)

  if (!incidencia) {
    throw new IncidenciaNoEncontradaError()
  }

  const nuevaDesde = body.fecha_desde
    ? new Date(body.fecha_desde as string)
    : incidencia.fecha_desde

  const nuevaHasta = body.fecha_hasta
    ? new Date(body.fecha_hasta as string)
    : incidencia.fecha_hasta

  if (
    isNaN(nuevaDesde.getTime()) ||
    isNaN(nuevaHasta.getTime()) ||
    nuevaDesde > nuevaHasta
  ) {
    throw new RangoFechasInvalidoError()
  }

  const codigarioItemId =
    body.codigarioItemId !== undefined
      ? Number(body.codigarioItemId)
      : incidencia.codigarioItemId

  if (
    body.codigarioItemId !== undefined &&
    codigarioItemId !== incidencia.codigarioItemId
  ) {
    const valido = await incidenciaRepository.verificarCodigarioItem(
      codigarioItemId,
      tenantId
    )

    if (!valido) {
      throw new CodigarioItemNoValidoError()
    }
  }

  const conflicto = await incidenciaRepository.verificarSuperposicion(
    incidencia.asignacionId,
    nuevaDesde,
    nuevaHasta,
    tenantId,
    id
  )

  if (conflicto) {
    throw new SuperposicionError(conflicto)
  }

  return incidenciaRepository.actualizar(id, tenantId, {
    fecha_desde: nuevaDesde,
    fecha_hasta: nuevaHasta,
    codigarioItemId,
    observacion: body.observacion as string | undefined,
  })
}