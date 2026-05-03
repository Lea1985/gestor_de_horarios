import prisma from "@/lib/prisma"

export const asignacionValidator = {

  async agenteExiste(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: {
        id: agenteId,
        deletedAt: null,
        instituciones: {
          some: { institucionId: tenantId }
        }
      },
      select: { id: true }
    })
  },

  async unidadExiste(unidadId: number, tenantId: number) {
    return prisma.unidadOrganizativa.findFirst({
      where: {
        id: unidadId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true }
    })
  },

  async materiaExiste(materiaId: number, tenantId: number) {
    if (!materiaId) return true

    return prisma.materia.findFirst({
      where: {
        id: materiaId,
        institucionId: tenantId,
      },
      select: { id: true }
    })
  },

  async cursoExiste(cursoId: number, tenantId: number) {
    if (!cursoId) return true

    return prisma.curso.findFirst({
      where: {
        id: cursoId,
        institucionId: tenantId,
      },
      select: { id: true }
    })
  },

  async comisionExiste(comisionId: number, tenantId: number) {
    if (!comisionId) return true

    return prisma.comision.findFirst({
      where: {
        id: comisionId,
        institucionId: tenantId,
      },
      select: { id: true }
    })
  },

  async turnoExiste(turnoId: number, tenantId: number) {
    if (!turnoId) return true

    return prisma.turno.findFirst({
      where: {
        id: turnoId,
        institucionId: tenantId,
      },
      select: { id: true }
    })
  },
}