// lib/usecases/periodosOperativos/eliminarPeriodo.ts
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoNoEncontradoError extends Error {
  constructor() { super("Período no encontrado o ya fue eliminado") }
}
export class NoSePuedeEliminarPeriodoActivoError extends Error {
  constructor() { super("No se puede eliminar el período ACTIVO. Cerralo primero.") }
}

export async function eliminarPeriodo(periodoId: number, tenantId: number) {
  const periodo = await periodoOperativoRepository.obtenerPorId(periodoId, tenantId, true)
  if (!periodo || periodo.deletedAt) throw new PeriodoNoEncontradoError()

  if (periodo.estado === "ACTIVO") {
    throw new NoSePuedeEliminarPeriodoActivoError()
  }

  return periodoOperativoRepository.eliminar(periodoId, tenantId)
}
