import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class DatosPeriodoInvalidosError extends Error {
  constructor() { super("nombre, fecha_desde y fecha_hasta son requeridos") }
}

export class FechasInvalidasError extends Error {
  constructor() { super("fecha_desde debe ser menor a fecha_hasta") }
}

export async function crearPeriodo(tenantId: number, body: {
  nombre?:      string
  fecha_desde?: Date | string
  fecha_hasta?: Date | string
  activo?:      boolean
}) {
  const { nombre, fecha_desde, fecha_hasta, activo } = body

  if (!nombre || !fecha_desde || !fecha_hasta) {
    throw new DatosPeriodoInvalidosError()
  }

  const desde = new Date(fecha_desde)
  const hasta = new Date(fecha_hasta)

  if (desde >= hasta) {
    throw new FechasInvalidasError()
  }

  return periodoOperativoRepository.crear({
    tenantId,
    nombre,
    fecha_desde: desde,
    fecha_hasta: hasta,
    activo: activo ?? false,
  })
}