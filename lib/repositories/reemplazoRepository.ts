// lib/repositories/reemplazoRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const reemplazoIncludeFull = {
  clase: {
    include: {
      modulo: true,
      unidad: true,
    },
  },

  asignacionTitular: {
    include: {
      titularidades: {
        where: { activo: true, fecha_hasta: null },
        include: {
          agente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
            },
          },
        },
        take: 1,
      },
    },
  },

  agenteSuplente: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      documento: true,
    },
  },
}

const reemplazoIncludeList = {
  clase: {
    select: {
      fecha: true,
      estado: true,

      modulo: {
        select: {
          dia_semana: true,
          hora_desde: true,
          hora_hasta: true,
        },
      },

      unidad: {
        select: {
          nombre: true,
        },
      },
    },
  },

  asignacionTitular: {
    select: {
      identificadorEstructural: true,

      titularidades: {
        where: {
          activo: true,
          fecha_hasta: null,
        },

        select: {
          agente: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
        },

        take: 1,
      },
    },
  },

  agenteSuplente: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
    },
  },
}

export const reemplazoRepository = {
  listar(
    tenantId: number,
    filtros: {
      claseId?: number
      asignacionTitularId?: number
      fecha_desde?: string | null
      fecha_hasta?: string | null
    }
  ) {
    const where: Prisma.ReemplazoWhereInput = {
      activo: true,
      clase: {
        institucionId: tenantId,
      },
    }

    if (filtros.claseId) {
      where.claseId = filtros.claseId
    }

    if (filtros.asignacionTitularId) {
      where.asignacionTitularId = filtros.asignacionTitularId
    }

    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.clase = {
        institucionId: tenantId,

        fecha: {
          ...(filtros.fecha_desde
            ? { gte: new Date(filtros.fecha_desde) }
            : {}),

          ...(filtros.fecha_hasta
            ? { lte: new Date(filtros.fecha_hasta) }
            : {}),
        },
      }
    }

    return prisma.reemplazo.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: reemplazoIncludeList,
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.reemplazo.findFirst({
      where: {
        id,
        activo: true,
        clase: {
          institucionId: tenantId,
        },
      },

      include: reemplazoIncludeFull,
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.reemplazo.findFirst({
      where: {
        id,
        activo: true,
        clase: {
          institucionId: tenantId,
        },
      },

      select: {
        id: true,
        claseId: true,
      },
    })
  },

  verificarAsignacion(asignacionId: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: {
        id: asignacionId,
        institucionId: tenantId,
      },

      select: {
        id: true,
      },
    })
  },

  verificarAgente(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: {
        id: agenteId,
        institucionId: tenantId,
        activo: true,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    })
  },

  verificarReemplazoActivo(claseId: number, tenantId: number) {
    return prisma.reemplazo.findFirst({
      where: {
        claseId,
        activo: true,

        clase: {
          institucionId: tenantId,
        },
      },

      select: {
        id: true,
      },
    })
  },

  verificarClase(claseId: number, tenantId: number) {
    return prisma.claseProgramada.findFirst({
      where: {
        id: claseId,
        institucionId: tenantId,
        OR: [
          { incidenciaId: null },
          { incidencia: { activo: true, deletedAt: null } },
        ],
      },
      select: { id: true },
    })
  },

  /**
   * Crea el registro de Reemplazo. No toca ClaseProgramada -- el usecase
   * (crearReemplazo.ts) llama a resolverClase() inmediatamente después,
   * que es quien decide estado/causa/versionResolucion.
   */
  async crear(
    tenantId: number,
    data: {
      claseId:             number
      asignacionTitularId: number
      agenteSuplenteId:    number
      incidenciaId?:       number | null
      observacion?:        string
    }
  ) {
    const clase = await prisma.claseProgramada.findFirst({
      where:  { id: data.claseId, institucionId: tenantId },
      select: { id: true },
    })
    if (!clase) return null

    return prisma.reemplazo.create({
      data: {
        claseId:             data.claseId,
        asignacionTitularId: data.asignacionTitularId,
        agenteSuplenteId:    data.agenteSuplenteId,
        incidenciaId:        data.incidenciaId ?? null,
        observacion:         data.observacion,
        activo:              true,
      },
    })
  },

  /**
   * Da de baja el Reemplazo. No toca ClaseProgramada -- el usecase
   * (eliminarReemplazo.ts) llama a resolverClase() inmediatamente después.
   */
  async eliminar(id: number, claseId: number, tenantId: number) {
    const reemplazo = await prisma.reemplazo.findFirst({
      where: {
        id,
        claseId,
        activo: true,

        clase: {
          institucionId: tenantId,
        },
      },

      select: {
        id: true,
      },
    })

    if (!reemplazo) return null

    return prisma.reemplazo.update({
      where: {
        id,
      },

      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },

}