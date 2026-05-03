// lib/usecases/turnos/eliminarTurno.ts

import { turnoRepository } from "@/lib/repositories/turnoRepository"

export async function eliminarTurno(
  id: number,
  tenantId: number
) {
  const existente = await turnoRepository.obtenerPorId(
    id,
    tenantId
  )

  if (!existente) {
    throw new Error("Turno no encontrado")
  }

  return turnoRepository.eliminar(id)
}