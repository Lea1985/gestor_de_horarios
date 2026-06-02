// lib/usecases/agentes/eliminarAgente.ts
import { agenteRepository } from "@/lib/repositories/agenteRepository"
import prisma from "@/lib/prisma"

export class AgenteNoEncontradoError extends Error {
  constructor() { super("Agente no encontrado") }
}

export class TieneAsignacionesActivasError extends Error {
  constructor() { super("No se puede eliminar un agente con asignaciones activas") }
}

export async function eliminarAgente(agenteId: number, tenantId: number) {
  const existe = await agenteRepository.existeEnTenant(agenteId, tenantId)
  if (!existe) throw new AgenteNoEncontradoError()

  // Regla: no eliminar si tiene asignaciones activas
  const tieneAsignaciones = await prisma.titularAsignacion.count({
    where: {
      agenteId,
      activo:      true,
      fecha_hasta: null,
      asignacion: {
        institucionId: tenantId,
        activo:        true,
        deletedAt:     null,
      },
    },
  })
  if (tieneAsignaciones > 0) throw new TieneAsignacionesActivasError()

  await agenteRepository.eliminar(agenteId, tenantId)
  return { ok: true }
}