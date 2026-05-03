// lib/usecases/turnos/actualizarTurno.ts

import { turnoRepository } from "@/lib/repositories/turnoRepository"

type Input = {
  nombre?: string
  horaInicio?: number
  horaFin?: number
  activo?: boolean
}

export async function actualizarTurno(
  id: number,
  tenantId: number,
  data: Input
) {
  const existente = await turnoRepository.obtenerPorId(
    id,
    tenantId
  )

  if (!existente) {
    throw new Error("Turno no encontrado")
  }

  const horaInicio =
    data.horaInicio ?? existente.horaInicio

  const horaFin =
    data.horaFin ?? existente.horaFin

  if (horaInicio >= horaFin) {
    throw new Error("La hora de inicio debe ser menor a la hora fin")
  }

  if (data.nombre !== undefined && !data.nombre.trim()) {
    throw new Error("El nombre es obligatorio")
  }

  return turnoRepository.actualizar(id, {
    ...(data.nombre !== undefined && {
      nombre: data.nombre.trim(),
    }),
    ...(data.horaInicio !== undefined && {
      horaInicio: data.horaInicio,
    }),
    ...(data.horaFin !== undefined && {
      horaFin: data.horaFin,
    }),
    ...(data.activo !== undefined && {
      activo: data.activo,
    }),
  })
}