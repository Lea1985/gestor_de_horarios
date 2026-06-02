// lib/usecases/periodosOperativos/eliminarPeriodo.ts

import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoNoEncontradoError extends Error {
  constructor() {
    super("Período no encontrado o ya fue eliminado")
  }
}

export class NoSePuedeEliminarPeriodoVigenteError extends Error {
  constructor() {
    super("No se puede eliminar el período operativo vigente")
  }
}

export async function eliminarPeriodo(
  periodoId: number,
  tenantId: number
) {

  const periodo = await periodoOperativoRepository.obtenerPorId(
    periodoId,
    tenantId,
    true
  )

  if (!periodo || periodo.deletedAt) {
    throw new PeriodoNoEncontradoError()
  }

  // Regla de negocio:
  // no se puede eliminar el período vigente
  if (periodo.vigente) {
    throw new NoSePuedeEliminarPeriodoVigenteError()
  }

  return periodoOperativoRepository.eliminar(
    periodoId,
    tenantId
  )
}