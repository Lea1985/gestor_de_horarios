// lib/usecases/calendarioEscolar/reactivarCalendarioEscolar.ts

import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class CalendarioEscolarNoEncontradoError extends Error {
  constructor() {
    super("Evento de calendario escolar no encontrado")
  }
}

export class PeriodoCerradoError extends Error {
  constructor() {
    super("El período está CERRADO, no se puede modificar su calendario")
  }
}

export async function reactivarCalendarioEscolar(
  calendarioId: number,
  tenantId: number
) {
  // existeEliminado ahora también devuelve periodoOperativoId (ver
  // ajuste en el repositorio abajo), así no hace falta una query extra.
  const existe = await calendarioEscolarRepository.existeEliminado(
    calendarioId,
    tenantId
  )
  if (!existe)
    throw new CalendarioEscolarNoEncontradoError()

  const periodo = await periodoOperativoRepository.obtenerPorId(
    existe.periodoOperativoId,
    tenantId,
    true
  )
  if (periodo?.estado === "CERRADO") {
    throw new PeriodoCerradoError()
  }

  await calendarioEscolarRepository.reactivar(
    calendarioId,
    tenantId
  )
  return { ok: true }
}