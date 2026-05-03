// lib/usecases/turnos/listarTurnos.ts

import { turnoRepository } from "@/lib/repositories/turnoRepository"

export async function listarTurnos(tenantId: number) {
  return turnoRepository.listar(tenantId)
}