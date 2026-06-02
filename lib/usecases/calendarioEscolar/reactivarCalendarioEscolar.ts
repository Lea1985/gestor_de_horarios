
// lib/usecases/calendarioEscolar/reactivarCalendarioEscolar.ts

import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"

export class CalendarioEscolarNoEncontradoError extends Error {
  constructor() {
    super("Evento de calendario escolar no encontrado")
  }
}

export async function reactivarCalendarioEscolar(
  calendarioId: number,
  tenantId: number
) {

  const existe =
    await calendarioEscolarRepository.existeEliminado(
      calendarioId,
      tenantId
    )

  if (!existe)
    throw new CalendarioEscolarNoEncontradoError()

  await calendarioEscolarRepository.reactivar(
    calendarioId,
    tenantId
  )

  return { ok: true }
}

