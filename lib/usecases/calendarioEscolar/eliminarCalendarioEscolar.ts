
// lib/usecases/calendarioEscolar/eliminarCalendarioEscolar.ts

import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"

export class CalendarioEscolarNoEncontradoError extends Error {
  constructor() {
    super("Evento de calendario escolar no encontrado")
  }
}

export async function eliminarCalendarioEscolar(
  calendarioId: number,
  tenantId: number
) {

  const existe =
    await calendarioEscolarRepository.existeEnTenant(
      calendarioId,
      tenantId
    )

  if (!existe)
    throw new CalendarioEscolarNoEncontradoError()

  await calendarioEscolarRepository.eliminar(
    calendarioId,
    tenantId
  )

  return { ok: true }
}

