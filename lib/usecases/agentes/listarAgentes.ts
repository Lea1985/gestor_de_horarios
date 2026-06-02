// lib/usecases/agentes/listarAgentes.ts
import { agenteRepository } from "@/lib/repositories/agenteRepository"
import prisma from "@/lib/prisma"

export async function listarAgentes(tenantId: number, incluirInactivos = false) {
  const agentes = await agenteRepository.listar(tenantId, incluirInactivos)

  // Obtener ids de agentes con titularidades vigentes en asignaciones activas
  const titularidades = await prisma.titularAsignacion.findMany({
    where: {
      activo:      true,
      fecha_hasta: null,
      agente: { institucionId: tenantId },
      asignacion: { activo: true, deletedAt: null },
    },
    select: { agenteId: true },
  })

  const idsConAsignacion = new Set(titularidades.map(t => t.agenteId))

  return agentes.map(a => ({
    ...a,
    tieneAsignacionesActivas: idsConAsignacion.has(a.id),
  }))
}