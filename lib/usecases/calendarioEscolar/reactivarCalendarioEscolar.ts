// lib/usecases/calendarioEscolar/reactivarCalendarioEscolar.ts

import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"

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

  // Si este evento suspende clases, reactivarlo debe volver a suspenderlas.
  if (existe.suspendeClases) {
    await claseProgramadaService.recalcularSuspendidasPorCalendario({
      institucionId:       tenantId,
      calendarioEscolarId: calendarioId,
      fecha:               existe.fecha,
      suspende:            true,
    })
  }

  return { ok: true }
}