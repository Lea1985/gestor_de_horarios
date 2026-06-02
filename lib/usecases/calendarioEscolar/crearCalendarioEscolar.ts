// lib/usecases/calendarioEscolar/crearCalendarioEscolar.ts

import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class DatosCalendarioEscolarInvalidosError extends Error {
  constructor() {
    super("fecha y descripcion son requeridos")
  }
}

export class PeriodoOperativoNoEncontradoError extends Error {
  constructor() {
    super("El período operativo no existe o no pertenece a la institución")
  }
}

export class FechaFueraDePeriodoError extends Error {
  constructor() {
    super("La fecha no pertenece al período operativo")
  }
}

export async function crearCalendarioEscolar(
  tenantId: number,

  body: {
    periodoOperativoId?: number

    fecha?: string
    descripcion?: string

    esFeriado?: boolean
    suspendeClases?: boolean
  }
) {

  const {
    periodoOperativoId,

    fecha,
    descripcion,

    esFeriado,
    suspendeClases,
  } = body

  if (!fecha || !descripcion || !periodoOperativoId) {
    throw new DatosCalendarioEscolarInvalidosError()
  }

  // Verificar período operativo
  const periodo =
    await periodoOperativoRepository.obtenerPorId(
      periodoOperativoId,
      tenantId,
      true
    )

  if (!periodo) {
    throw new PeriodoOperativoNoEncontradoError()
  }

  const fechaDate = new Date(fecha)

  // Validar rango del período
  if (
    fechaDate < periodo.fecha_desde ||
    fechaDate > periodo.fecha_hasta
  ) {
    throw new FechaFueraDePeriodoError()
  }

  return calendarioEscolarRepository.crear({

    tenantId,
    periodoOperativoId,

    fecha: fechaDate,

    descripcion: descripcion.trim(),

    esFeriado: esFeriado ?? false,

    suspendeClases: suspendeClases ?? false,
  })
}