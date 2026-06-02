// lib/usecases/periodosOperativos/actualizarPeriodo.ts

import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoNoEncontradoError extends Error {
  constructor() {
    super("Período no encontrado o no pertenece a la institución")
  }
}

export class FechasInvalidasError extends Error {
  constructor() {
    super("fecha_desde debe ser menor a fecha_hasta")
  }
}

export async function actualizarPeriodo(
  periodoId: number,
  tenantId: number,
  data: {
    nombre?: string
    fecha_desde?: Date | string
    fecha_hasta?: Date | string
  }
) {

  // Verificar existencia
  const existe = await periodoOperativoRepository.existeEnTenant(
    periodoId,
    tenantId
  )

  if (!existe) {
    throw new PeriodoNoEncontradoError()
  }

  // Validación de fechas
  if (data.fecha_desde && data.fecha_hasta) {

    const desde = new Date(data.fecha_desde)
    const hasta = new Date(data.fecha_hasta)

    if (desde >= hasta) {
      throw new FechasInvalidasError()
    }

  } else if (data.fecha_desde) {

    const periodoActual =
      await periodoOperativoRepository.obtenerPorId(
        periodoId,
        tenantId,
        true
      )

    if (
      periodoActual &&
      new Date(data.fecha_desde) >= periodoActual.fecha_hasta
    ) {
      throw new FechasInvalidasError()
    }

  } else if (data.fecha_hasta) {

    const periodoActual =
      await periodoOperativoRepository.obtenerPorId(
        periodoId,
        tenantId,
        true
      )

    if (
      periodoActual &&
      periodoActual.fecha_desde >= new Date(data.fecha_hasta)
    ) {
      throw new FechasInvalidasError()
    }
  }

  // Preparar datos
  const updateData: any = {}

  if (data.nombre !== undefined) {
    updateData.nombre = data.nombre
  }

  if (data.fecha_desde !== undefined) {
    updateData.fecha_desde = new Date(data.fecha_desde)
  }

  if (data.fecha_hasta !== undefined) {
    updateData.fecha_hasta = new Date(data.fecha_hasta)
  }

  return periodoOperativoRepository.actualizar(
    periodoId,
    tenantId,
    updateData
  )
}