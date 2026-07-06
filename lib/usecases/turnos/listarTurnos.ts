// lib/usecases/turnos/listarTurnos.ts
import { turnoRepository } from "@/lib/repositories/turnoRepository"
import prisma from "@/lib/prisma"

export async function listarTurnos(tenantId: number, incluirInactivos = false) {
  const turnos = await turnoRepository.listar(tenantId, incluirInactivos)

  const asignaciones = await prisma.asignacion.findMany({
    where: {
      institucionId: tenantId,
      activo:        true,
      deletedAt:     null,
    },
    select: { turnoId: true },
  })

  const idsConAsignacion = new Set(asignaciones.map(a => a.turnoId))

  return turnos.map(t => ({
    ...t,
    tieneAsignacionesActivas: idsConAsignacion.has(t.id),
  }))
}