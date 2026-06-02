// lib/usecases/turnos/eliminarTurno.ts
import { turnoRepository } from "@/lib/repositories/turnoRepository"
import prisma from "@/lib/prisma"

export class TurnoNoEncontradoError extends Error {
  constructor() { super("Turno no encontrado") }
}

export class TieneAsignacionesActivasError extends Error {
  constructor() { super("No se puede eliminar un turno con asignaciones activas") }
}

export async function eliminarTurno(id: number, tenantId: number) {
  const existente = await turnoRepository.obtenerPorId(id, tenantId)
  if (!existente) throw new TurnoNoEncontradoError()

  // Regla: no eliminar si tiene asignaciones activas
  const tieneAsignaciones = await prisma.asignacion.count({
    where: {
      turnoId:       id,
      institucionId: tenantId,
      activo:        true,
      deletedAt:     null,
    },
  })
  if (tieneAsignaciones > 0) throw new TieneAsignacionesActivasError()

  return turnoRepository.eliminar(id, tenantId)
}