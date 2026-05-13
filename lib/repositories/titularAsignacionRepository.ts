// lib/repositories/titularAsignacionRepository.ts
import prisma from "@/lib/prisma"

const includeAgente = {
  agente: {
    select: {
      id:       true,
      nombre:   true,
      apellido: true,
      documento: true,
      email:    true,
    },
  },
} as const

export const titularAsignacionRepository = {
  /**
   * Historial completo de titulares de una asignación, ordenado por fecha_desde desc.
   */
  listar(asignacionId: number, tenantId: number) {
    return prisma.titularAsignacion.findMany({
      where: {
        asignacionId,
        institucionId: tenantId,
        deletedAt: null,
      },
      include: includeAgente,
      orderBy: { fecha_desde: "desc" },
    })
  },

  /**
   * Titular actualmente vigente: activo = true y fecha_hasta = null.
   */
  obtenerActual(asignacionId: number, tenantId: number) {
    return prisma.titularAsignacion.findFirst({
      where: {
        asignacionId,
        institucionId: tenantId,
        activo: true,
        fecha_hasta: null,
        deletedAt: null,
      },
      include: includeAgente,
    })
  },
}
