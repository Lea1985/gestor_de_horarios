// lib/usecases/periodosOperativos/restaurarPeriodo.ts

import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoNoEliminadoError extends Error {
  constructor() {
    super("El período no existe o no está eliminado")
  }
}

export async function restaurarPeriodo(
  periodoId: number,
  tenantId: number
) {
  const periodo = await periodoOperativoRepository.obtenerPorId(
    periodoId,
    tenantId,
    true // incluir eliminados
  )

  if (!periodo || !periodo.deletedAt) {
    throw new PeriodoNoEliminadoError()
  }

  return periodoOperativoRepository.reactivar(periodoId, tenantId)
}