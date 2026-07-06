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

  async crear(
    tenantId: number,
    data: {
      claseId:             number
      asignacionTitularId: number
      agenteSuplenteId:    number
      incidenciaId?:       number | null   // NUEVO
      observacion?:        string
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const clase = await tx.claseProgramada.findFirst({
        where:  { id: data.claseId, institucionId: tenantId },
        select: { id: true },
      })
      if (!clase) return null

      const [reemplazo] = await Promise.all([
        tx.reemplazo.create({
          data: {
            claseId:             data.claseId,
            asignacionTitularId: data.asignacionTitularId,
            agenteSuplenteId:    data.agenteSuplenteId,
            incidenciaId:        data.incidenciaId ?? null,   // NUEVO
            observacion:         data.observacion,
            activo:              true,
          },
        }),
        tx.claseProgramada.update({
          where: { id: data.claseId },
          data:  { estado: "REEMPLAZADA" },
        }),
      ])

      return reemplazo
    })
  },

  async eliminar(id: number, claseId: number, tenantId: number) {
    return prisma.$transaction(async (tx) => {
      const reemplazo = await tx.reemplazo.findFirst({
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

      return Promise.all([
        tx.reemplazo.update({
          where: {
            id,
          },

          data: {
            activo: false,
            deletedAt: new Date(),
          },
        }),

        tx.claseProgramada.update({
          where: {
            id: claseId,
          },

          data: {
            estado: "PROGRAMADA",
          },
        }),
      ])
    })
  },


  /**
   * Detecta, para las clases futuras (>= desde) de una asignación, qué
   * incidencias tienen reemplazos activos que se perderían al recrear
   * la distribución. Si todos los reemplazos de una incidencia usan el
   * mismo suplente, se marca migrable=true.
   */
  async detectarReemplazosParaMigrar(asignacionId: number, tenantId: number, desde: Date) {
    const incidencias = await prisma.incidencia.findMany({
      where: {
        asignacionId,
        deletedAt: null,
        fecha_hasta: { gte: desde },
      },
      select: {
        id: true,
        fecha_desde: true,
        fecha_hasta: true,
        observacion: true,
        codigarioItem: { select: { nombre: true, codigo: true } },
      },
    })

    const resultado = []

    for (const inc of incidencias) {
      const clases = await prisma.claseProgramada.findMany({
        where: {
          incidenciaId: inc.id,
          institucionId: tenantId,
          fecha: { gte: desde },
          estado: "REEMPLAZADA",
        },
        select: {
          reemplazos: {
            where: { activo: true },
            select: {
              asignacionTitularId: true,
              agenteSuplenteId: true,
              agenteSuplente: { select: { nombre: true, apellido: true } },
            },
          },
        },
      })

      const reemplazosActivos = clases.flatMap(c => c.reemplazos)
      if (reemplazosActivos.length === 0) continue

      const suplentesUnicos = new Set(
        reemplazosActivos.map(r => `${r.asignacionTitularId}-${r.agenteSuplenteId}`)
      )
      const migrable = suplentesUnicos.size === 1

      resultado.push({
        incidenciaId:            inc.id,
        fecha_desde:             inc.fecha_desde,
        fecha_hasta:             inc.fecha_hasta,
        codigario:               inc.codigarioItem?.nombre ?? null,
        observacion:             inc.observacion,
        totalClasesConReemplazo: reemplazosActivos.length,
        migrable,
        suplente: migrable
          ? {
              asignacionTitularId: reemplazosActivos[0].asignacionTitularId,
              agenteSuplenteId:    reemplazosActivos[0].agenteSuplenteId,
              nombre:              `${reemplazosActivos[0].agenteSuplente.apellido}, ${reemplazosActivos[0].agenteSuplente.nombre}`,
            }
          : null,
      })
    }

    return resultado
  },

  /**
   * Aplica el suplente detectado como uniforme a las clases nuevas
   * (sin incidencia todavía) que caigan dentro del rango de cada
   * incidencia elegida por el usuario para migrar.
   */
  async migrarReemplazosAIncidencias(
    asignacionId: number,
    tenantId: number,
    incidenciaIds: number[],
    candidatos: Array<{
      incidenciaId: number
      migrable: boolean
      suplente: { asignacionTitularId: number; agenteSuplenteId: number } | null
    }>
  ) {
    let total = 0

    for (const id of incidenciaIds) {
      const candidato = candidatos.find(c => c.incidenciaId === id)
      if (!candidato?.migrable || !candidato.suplente) continue

      const incidencia = await prisma.incidencia.findFirst({
        where: { id, deletedAt: null, asignacion: { institucionId: tenantId } },
        select: { fecha_desde: true, fecha_hasta: true },
      })
      if (!incidencia) continue

      const clasesNuevas = await prisma.claseProgramada.findMany({
        where: {
          asignacionId,
          institucionId: tenantId,
          incidenciaId: null,
          estado: "PROGRAMADA",
          fecha: { gte: incidencia.fecha_desde, lte: incidencia.fecha_hasta },
        },
        select: { id: true },
      })
      if (clasesNuevas.length === 0) continue

      const ids = clasesNuevas.map(c => c.id)

      await prisma.$transaction(async (tx) => {
        await tx.claseProgramada.updateMany({
          where: { id: { in: ids } },
          data:  { incidenciaId: id, estado: "REEMPLAZADA" },
        })
        await tx.reemplazo.createMany({
          data: ids.map(claseId => ({
            claseId,
            asignacionTitularId: candidato.suplente!.asignacionTitularId,
            agenteSuplenteId:    candidato.suplente!.agenteSuplenteId,
            observacion:         "Migrado automáticamente al crear nueva versión de la distribución",
            activo:              true,
          })),
        })
      })

      total += ids.length
    }

    return total
  },

}