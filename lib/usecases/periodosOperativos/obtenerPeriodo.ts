// lib/usecases/periodosOperativos/obtenerPeriodo.ts

import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoNoEncontradoError extends Error {
  constructor() {
    super("Período no encontrado")
  }
}

export async function obtenerPeriodo(
  periodoId: number,
  tenantId: number,
  incluirEliminados = false
) {

  const periodo = await periodoOperativoRepository.obtenerPorId(
    periodoId,
    tenantId,
    incluirEliminados
  )

  if (!periodo) {
    throw new PeriodoNoEncontradoError()
  }

  return periodo
}