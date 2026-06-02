// lib/usecases/calendarioEscolar/actualizarCalendarioEscolar.ts

import { calendarioEscolarRepository }
  from "@/lib/repositories/calendarioEscolarRepository"

import { periodoOperativoRepository }
  from "@/lib/repositories/periodoOperativoRepository"

export class CalendarioEscolarNoEncontradoError extends Error {
  constructor() {
    super("Evento de calendario escolar no encontrado")
  }
}

export class SinCamposParaActualizarError extends Error {
  constructor() {
    super("No hay campos para actualizar")
  }
}

export class FechaFueraDePeriodoError extends Error {
  constructor() {
    super("La fecha no pertenece al período operativo")
  }
}

export async function actualizarCalendarioEscolar(
  calendarioId: number,
  tenantId: number,

  body: {
    fecha?: Date
    descripcion?: string

    esFeriado?: boolean
    suspendeClases?: boolean
  }
) {

  const registro =
    await calendarioEscolarRepository.obtenerPorId(
      calendarioId,
      tenantId
    )

  if (!registro)
    throw new CalendarioEscolarNoEncontradoError()

  const campos = [
    "fecha",
    "descripcion",
    "esFeriado",
    "suspendeClases",
  ]

  const tieneCampos = campos.some(
    c => body[c as keyof typeof body] !== undefined
  )

  if (!tieneCampos)
    throw new SinCamposParaActualizarError()

  // Validar rango del período operativo
  if (body.fecha) {

    const periodo =
      await periodoOperativoRepository.obtenerPorId(
        registro.periodoOperativoId,
        tenantId,
        true
      )

    if (!periodo) {
      throw new FechaFueraDePeriodoError()
    }

    const fecha =
      new Date(body.fecha)

    if (
      fecha < periodo.fecha_desde ||
      fecha > periodo.fecha_hasta
    ) {
      throw new FechaFueraDePeriodoError()
    }
  }

  return calendarioEscolarRepository.actualizar(
    calendarioId,
    tenantId,
    body
  )
}