// lib/usecases/turnos/crearTurno.ts

import { turnoRepository } from "@/lib/repositories/turnoRepository"

type Input = {
  nombre: string
  horaInicio: number
  horaFin: number
}

export async function crearTurno(
  tenantId: number,
  data: Input
) {
  if (!data.nombre.trim()) {
    throw new Error("El nombre es obligatorio")
  }

  if (data.horaInicio >= data.horaFin) {
    throw new Error("La hora de inicio debe ser menor a la hora fin")
  }

  return turnoRepository.crear(tenantId, {
    nombre: data.nombre,
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
  })
}