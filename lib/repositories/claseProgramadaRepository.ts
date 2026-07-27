// lib/repositories/claseProgramadaRepository.ts
import prisma from "@/lib/prisma"
import { EstadoClase, Prisma } from "@prisma/client"

const claseIncludeFull = {
  modulo:   true,
  unidad:   true,
  comision: true,
  asignacion: {
    include: {
      titularidades: {
        where:   { activo: true, fecha_hasta: null },
        include: { agente: { select: { nombre: true, apellido: true, documento: true } } },
        take:    1,
      },
    },
  },
  incidencia: {
    include: { codigarioItem: { select: { codigo: true, nombre: true } } },
  },
  reemplazos: {
    include: {
      asignacionTitular: { select: { identificadorEstructural: true } },
      agenteSuplente: { select: { nombre: true, apellido: true, documento: true } },
    },
  },
}

const claseIncludeList = {
  modulo:    { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
  unidad:    { select: { nombre: true, codigoUnidad: true } },
  comision:  { select: { id: true, nombre: true } },
  asignacion: {
    select: {
      identificadorEstructural: true,

      materia: {
        select: {
          nombre: true,
        },
      },

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
  incidencia: { select: { id: true, fecha_desde: true, fecha_hasta: true, observacion: true } },
  reemplazos: {
    select: {
      id: true,
      asignacionTitularId: true,
      agenteSuplenteId: true,
      observacion: true,
      activo: true,
      agenteSuplente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          documento: true,
        },
      },
      asignacionTitular: {
        select: {
          identificadorEstructural: true,
        },
      },
    },
  },
}

const claseIncludeConReemplazos = {
  modulo:   { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
  unidad:   { select: { nombre: true, codigoUnidad: true } },
  comision: { select: { id: true, nombre: true } },
  reemplazos: {
    select: {
      id:                  true,
      asignacionTitularId: true,
      observacion:         true,
      activo:              true,
      agenteSuplente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          documento: true,
          email: true,
        },
      },
      asignacionTitular: {
        select: {
          identificadorEstructural: true,
          materia: {
            select: { nombre: true }
          },
          comision: {
            select: { nombre: true }
          }
        },
      },
    },
  },
}

export const claseProgramadaRepository = {

  listar(tenantId: number, filtros: {
    asignacionId?: number
    moduloId?:     number
    unidadId?:     number
    comisionId?:   number
    estado?:       EstadoClase
    fechaDesde?:   Date
    fechaHasta?:   Date
  }) {
    const where: Prisma.ClaseProgramadaWhereInput = { institucionId: tenantId }
    if (filtros.asignacionId) where.asignacionId = filtros.asignacionId
    if (filtros.moduloId)     where.moduloId     = filtros.moduloId
    if (filtros.unidadId)     where.unidadId     = filtros.unidadId
    if (filtros.comisionId)   where.comisionId   = filtros.comisionId
    if (filtros.estado)       where.estado       = filtros.estado
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {}
      if (filtros.fechaDesde) (where.fecha as Prisma.DateTimeFilter).gte = filtros.fechaDesde
      if (filtros.fechaHasta) (where.fecha as Prisma.DateTimeFilter).lte = filtros.fechaHasta
    }
    return prisma.claseProgramada.findMany({
      where,
      orderBy: { fecha: "asc" },
      include: claseIncludeList,
    })
  },

  listarPorIncidencia(
    tenantId:     number,
    asignacionId: number,
    fechaDesde:   Date,
    fechaHasta:   Date,
  ) {
    return prisma.claseProgramada.findMany({
      where: {
        institucionId: tenantId,
        asignacionId,
        fecha: { gte: fechaDesde, lte: fechaHasta },
      },
      orderBy: { fecha: "asc" },
      include: claseIncludeConReemplazos,
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.claseProgramada.findFirst({
      where:   { id, institucionId: tenantId },
      include: claseIncludeFull,
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.claseProgramada.findFirst({
      where:  { id, institucionId: tenantId },
      select: { id: true, asignacionId: true },
    })
  },

  actualizar(id: number, data: Partial<{ estado: EstadoClase; incidenciaId: number | null }>) {
    return prisma.claseProgramada.update({ where: { id }, data })
  },

  verificarIncidencia(incidenciaId: number, asignacionId: number) {
    return prisma.incidencia.findFirst({
      where:  { id: incidenciaId, asignacionId, deletedAt: null },
      select: { id: true },
    })
  },

  listarFeriados(tenantId: number, periodoOperativoId: number, desde: Date, hasta: Date) {
    return prisma.calendarioEscolar.findMany({
      where: {
        institucionId:     tenantId,
        periodoOperativoId,
        suspendeClases:    true,
        activo:            true,
        deletedAt:         null,
        fecha: { gte: desde, lte: hasta },
      },
      select: { fecha: true },
    })
  },
}