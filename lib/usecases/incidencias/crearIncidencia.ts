// lib/usecases/incidencias/crearIncidencia.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"
import prisma from "@/lib/prisma"
import { resolverClasesIncidencia } from "./resolverClasesIncidencia"

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
  constructor() { super("Incidencia padre no válida o se encuentra eliminada") }
}
export class FechaFueraDePadreError extends Error {
  constructor() { super("El rango de la incidencia no puede exceder el de la incidencia padre") }
}
export class SinClasesProgramadasError extends Error {
  constructor() { super("No hay clases programadas para esta asignación en el rango de fechas indicado") }
}
export class SuperposicionError extends Error {
  constructor(
    public readonly conflicto: {
      id: number
      fecha_desde: Date
      fecha_hasta: Date
    }
  ) {
    super("Superposición de fechas con otra incidencia")
  }
}

export async function crearIncidencia(
  tenantId: number,
  body: {
    asignacionId?:      number
    fecha_desde?:       string
    fecha_hasta?:       string
    codigarioItemId?:   number
    incidenciaPadreId?: number | null
    observacion?:       string
  }
) {
  const { asignacionId, fecha_desde, fecha_hasta, codigarioItemId, incidenciaPadreId, observacion } = body

  if (!asignacionId || !fecha_desde || !fecha_hasta || !codigarioItemId) {
    throw new DatosIncidenciaInvalidosError()
  }

  const fechaDesde = new Date(fecha_desde)
  const fechaHasta = new Date(fecha_hasta)

  if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) {
    throw new RangoFechasInvalidoError()
  }

  if (fechaDesde > fechaHasta) {
    throw new RangoFechasInvalidoError()
  }

  const asignacion = await incidenciaRepository.verificarAsignacion(asignacionId, tenantId)
  if (!asignacion) throw new AsignacionNoValidaError()

  const codigario = await incidenciaRepository.verificarCodigarioItem(codigarioItemId, tenantId)
  if (!codigario) throw new CodigarioItemNoValidoError()

  if (incidenciaPadreId) {
    const padre = await incidenciaRepository.verificarPadre(incidenciaPadreId, asignacionId, tenantId)
    if (!padre) throw new IncidenciaPadreNoValidaError()

    // Validar que el rango esté completamente dentro del rango del padre
    if (fechaDesde < padre.fecha_desde || fechaHasta > padre.fecha_hasta) {
      throw new FechaFueraDePadreError()
    }
  }

  // Validar que existan clases programadas en el rango para esta asignación
  const claseEnRango = await prisma.claseProgramada.findFirst({
    where: {
      asignacionId,
      institucionId: tenantId,
      fecha: { gte: fechaDesde, lte: fechaHasta },
    },
    select: { id: true },
  })
  if (!claseEnRango) throw new SinClasesProgramadasError()

  const conflicto = await incidenciaRepository.verificarSuperposicion(
    asignacionId,
    fechaDesde,
    fechaHasta,
    tenantId,
    undefined,
    incidenciaPadreId
  )
  if (conflicto) throw new SuperposicionError(conflicto)

  const nueva = await incidenciaRepository.crear({
    asignacionId,
    fecha_desde:      fechaDesde,
    fecha_hasta:      fechaHasta,
    codigarioItemId,
    incidenciaPadreId,
    observacion,
  })

  await resolverClasesIncidencia(nueva.id, tenantId)

  return nueva
}