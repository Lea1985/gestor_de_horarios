import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export class DatosIncidenciaInvalidosError extends Error {
  constructor() { super("asignacionId, fecha_desde, fecha_hasta y codigarioItemId son requeridos") }
}

export class RangoFechasInvalidoError extends Error {
  constructor() { super("Rango de fechas inválido") }
}

export class AsignacionNoValidaError extends Error {
  constructor() { super("Asignación no válida") }
}

export class CodigarioItemNoValidoError extends Error {
  constructor() { super("Código de incidencia no válido para esta institución") }
}

export class IncidenciaPadreNoValidaError extends Error {
  constructor() { super("Incidencia padre no válida") }
}

export class SuperposicionError extends Error {
  constructor(public readonly conflicto: { id: number; fecha_desde: Date; fecha_hasta: Date }) {
    super("Superposición de fechas con otra incidencia")
  }
}

export async function crearIncidencia(tenantId: number, body: {
  asignacionId?:      number
  fecha_desde?:       string
  fecha_hasta?:       string
  codigarioItemId?:   number
  incidenciaPadreId?: number | null
  observacion?:       string
}) {
  const { asignacionId, fecha_desde, fecha_hasta, codigarioItemId, incidenciaPadreId, observacion } = body

  if (!asignacionId || !fecha_desde || !fecha_hasta || !codigarioItemId) {
    throw new DatosIncidenciaInvalidosError()
  }

  const fechaDesde = new Date(fecha_desde)
  const fechaHasta = new Date(fecha_hasta)
  if (fechaDesde > fechaHasta) throw new RangoFechasInvalidoError()

  if (!await incidenciaRepository.verificarAsignacion(asignacionId, tenantId)) {
    throw new AsignacionNoValidaError()
  }

  if (!await incidenciaRepository.verificarCodigarioItem(codigarioItemId, tenantId)) {
    throw new CodigarioItemNoValidoError()
  }

  if (incidenciaPadreId) {
    if (!await incidenciaRepository.verificarPadre(incidenciaPadreId, asignacionId)) {
      throw new IncidenciaPadreNoValidaError()
    }
  }

  const conflicto = await incidenciaRepository.verificarSuperposicion(asignacionId, fechaDesde, fechaHasta)
  if (conflicto) throw new SuperposicionError(conflicto)

  return incidenciaRepository.crear({ asignacionId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, codigarioItemId, incidenciaPadreId, observacion })
}