// lib/usecases/periodosOperativos/actualizarPeriodo.ts
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoNoEncontradoError extends Error {
  constructor() { super("Período no encontrado o no pertenece a la institución") }
}
export class FechasInvalidasError extends Error {
  constructor() { super("fecha_desde debe ser menor a fecha_hasta") }
}
export class PeriodoCerradoError extends Error {
  constructor() { super("El período está CERRADO y no admite modificaciones") }
}
export class CampoEstructuralEnPeriodoActivoError extends Error {
  constructor(campos: string[]) {
    super(`No se pueden modificar campos estructurales (${campos.join(", ")}) con el período ACTIVO`)
  }
}

const CAMPOS_ESTRUCTURALES = ["fecha_desde", "fecha_hasta"] as const

export async function actualizarPeriodo(
  periodoId: number,
  tenantId: number,
  data: { nombre?: string; fecha_desde?: Date | string; fecha_hasta?: Date | string }
) {
  const periodoActual = await periodoOperativoRepository.obtenerPorId(periodoId, tenantId, true)
  if (!periodoActual) throw new PeriodoNoEncontradoError()

  if (periodoActual.estado === "CERRADO") throw new PeriodoCerradoError()

  if (periodoActual.estado === "ACTIVO") {
    const camposTocados = CAMPOS_ESTRUCTURALES.filter(c => data[c] !== undefined)
    if (camposTocados.length > 0) {
      throw new CampoEstructuralEnPeriodoActivoError(camposTocados)
    }
    // En ACTIVO solo se permite tocar `nombre` (dato administrativo).
  }

  if (data.fecha_desde && data.fecha_hasta) {
    if (new Date(data.fecha_desde) >= new Date(data.fecha_hasta)) throw new FechasInvalidasError()
  } else if (data.fecha_desde) {
    if (new Date(data.fecha_desde) >= periodoActual.fecha_hasta) throw new FechasInvalidasError()
  } else if (data.fecha_hasta) {
    if (periodoActual.fecha_desde >= new Date(data.fecha_hasta)) throw new FechasInvalidasError()
  }

  const updateData: { nombre?: string; fecha_desde?: Date; fecha_hasta?: Date } = {}
  if (data.nombre !== undefined)      updateData.nombre = data.nombre
  if (data.fecha_desde !== undefined) updateData.fecha_desde = new Date(data.fecha_desde)
  if (data.fecha_hasta !== undefined) updateData.fecha_hasta = new Date(data.fecha_hasta)

  return periodoOperativoRepository.actualizar(periodoId, tenantId, updateData)
}
