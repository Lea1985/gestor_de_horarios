// lib/usecases/turnos/obtenerTurno.ts

import { turnoRepository } from "@/lib/repositories/turnoRepository"

export async function obtenerTurno(
  id: number,
  tenantId: number
) {
  return turnoRepository.obtenerPorId(id, tenantId)
}