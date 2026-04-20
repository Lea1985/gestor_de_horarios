//lib/usecases/clases/generarClases.ts
import { claseRepository } from "@/lib/repositories/claseRepository"

export class DatosGenerarInvalidosError extends Error {
  constructor() { super("distribucionHorariaId, fecha_desde y fecha_hasta son obligatorios") }
}

export class FechasInvalidasError extends Error {
  constructor() { super("Fechas inválidas") }
}

export class RangoInvalidoError extends Error {
  constructor() { super("fecha_desde debe ser anterior a fecha_hasta") }
}

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}

export async function generarClases(tenantId: number, body: {
  distribucionHorariaId?: number
  fecha_desde?:           string
  fecha_hasta?:           string
}) {
  const { distribucionHorariaId, fecha_desde, fecha_hasta } = body

  if (!distribucionHorariaId || !fecha_desde || !fecha_hasta) {
    throw new DatosGenerarInvalidosError()
  }

  const desde = new Date(fecha_desde)
  const hasta = new Date(fecha_hasta)

  if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) throw new FechasInvalidasError()
  if (desde > hasta) throw new RangoInvalidoError()

  const result = await claseRepository.generarClases(tenantId, distribucionHorariaId, desde, hasta)
  if (!result) throw new DistribucionNoEncontradaError()

  return {
    ok: true,
    rango: { desde: fecha_desde, hasta: fecha_hasta },
    ...result,
  }
}