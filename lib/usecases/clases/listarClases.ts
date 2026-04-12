// lib/usecases/clases/listarClases.ts
import { claseRepository } from "@/lib/repositories/claseRepository"
import { EstadoClase } from "@prisma/client"

export class FiltrosInsuficientesError extends Error {
  constructor() { super("Se requiere al menos uno de: asignacionId, unidadId, comisionId, fecha_desde") }
}

export class EstadoInvalidoError extends Error {
  constructor(estados: string[]) { super(`Estado inválido. Válidos: ${estados.join(", ")}`) }
}

const ESTADOS_VALIDOS = Object.values(EstadoClase)

function normalizarRango(fechaDesde?: string | null, fechaHasta?: string | null) {
  let gte: Date | undefined
  let lte: Date | undefined
  if (fechaDesde) { gte = new Date(fechaDesde); gte.setHours(0, 0, 0, 0) }
  if (fechaHasta) { lte = new Date(fechaHasta); lte.setHours(23, 59, 59, 999) }
  return { gte, lte }
}

export async function listarClases(tenantId: number, params: {
  asignacionId?: string | null
  moduloId?:     string | null
  unidadId?:     string | null
  comisionId?:   string | null
  estado?:       string | null
  fecha_desde?:  string | null
  fecha_hasta?:  string | null
}) {
  const { asignacionId, moduloId, unidadId, comisionId, estado, fecha_desde, fecha_hasta } = params

  if (!asignacionId && !unidadId && !comisionId && !fecha_desde) {
    throw new FiltrosInsuficientesError()
  }

  if (estado && !ESTADOS_VALIDOS.includes(estado as EstadoClase)) {
    throw new EstadoInvalidoError(ESTADOS_VALIDOS)
  }

  const { gte, lte } = normalizarRango(fecha_desde, fecha_hasta)

  return claseRepository.listar(tenantId, {
    asignacionId: asignacionId ? parseInt(asignacionId) : undefined,
    moduloId:     moduloId     ? parseInt(moduloId)     : undefined,
    unidadId:     unidadId     ? parseInt(unidadId)     : undefined,
    comisionId:   comisionId   ? parseInt(comisionId)   : undefined,
    estado:       estado       ? estado as EstadoClase  : undefined,
    fechaDesde:   gte,
    fechaHasta:   lte,
  })
}