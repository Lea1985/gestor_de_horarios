
// lib/usecases/calendarioEscolar/obtenerCalendarioEscolar.ts

import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"

export class CalendarioEscolarNoEncontradoError extends Error {
  constructor() {
    super("Evento de calendario escolar no encontrado")
  }
}

export async function obtenerCalendarioEscolar(
  calendarioId: number,
  tenantId: number
) {

  const registro =
    await calendarioEscolarRepository.obtenerPorId(
      calendarioId,
      tenantId
    )

  if (!registro)
    throw new CalendarioEscolarNoEncontradoError()

  return registro
}

