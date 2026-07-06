// lib/usecases/turnos/reactivarTurno.ts
import { turnoRepository } from "@/lib/repositories/turnoRepository"

export class TurnoNoEncontradoError extends Error {
  constructor() { super("Turno no encontrado") }
}

export async function reactivarTurno(id: number, tenantId: number) {
  const result = await turnoRepository.reactivar(id, tenantId)
  if (!result) throw new TurnoNoEncontradoError()
  return result
}