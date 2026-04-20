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
      agente: { select: { nombre: true, apellido: true, documento: true } },
    },
  },
  asignacionSuplente: {
    include: {
      agente: { select: { nombre: true, apellido: true, documento: true } },
    },
  },
}

const reemplazoIncludeList = {
  clase: {
    select: {
      fecha:  true,
      estado: true,
      modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
      unidad: { select: { nombre: true } },
    },
  },
  asignacionTitular:  { select: { identificadorEstructural: true, agenteId: true } },
  asignacionSuplente: { select: { identificadorEstructural: true, agenteId: true } },
}

export const reemplazoRepository = {

  listar(tenantId: number, filtros: {
    claseId?:              number
    asignacionTitularId?:  number
    asignacionSuplenteId?: number
    fecha_desde?:          string | null
    fecha_hasta?:          string | null
  }) {
    const where: Prisma.ReemplazoWhereInput = {
      activo: true,
      clase:  { institucionId: tenantId },
    }

    if (filtros.claseId)              where.claseId              = filtros.claseId
    if (filtros.asignacionTitularId)  where.asignacionTitularId  = filtros.asignacionTitularId
    if (filtros.asignacionSuplenteId) where.asignacionSuplenteId = filtros.asignacionSuplenteId

    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.clase = {
        institucionId: tenantId,
        fecha: {
          ...(filtros.fecha_desde ? { gte: new Date(filtros.fecha_desde) } : {}),
          ...(filtros.fecha_hasta ? { lte: new Date(filtros.fecha_hasta) } : {}),
        },
      }
    }

    return prisma.reemplazo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: reemplazoIncludeList,
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.reemplazo.findFirst({
      where: { id, activo: true, clase: { institucionId: tenantId } },
      include: reemplazoIncludeFull,
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.reemplazo.findFirst({
      where: { id, activo: true, clase: { institucionId: tenantId } },
      select: { id: true, claseId: true },
    })
  },

  verificarClase(claseId: number, tenantId: number) {
    return prisma.claseProgramada.findFirst({
      where: { id: claseId, institucionId: tenantId },
      select: { id: true },
    })
  },

  verificarAsignacion(asignacionId: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: { id: asignacionId, institucionId: tenantId },
      select: { id: true },
    })
  },

  verificarReemplazoActivo(claseId: number) {
    return prisma.reemplazo.findFirst({
      where: { claseId, activo: true },
      select: { id: true },
    })
  },

  crear(data: {
    claseId:              number
    asignacionTitularId:  number
    asignacionSuplenteId: number
    observacion?:         string
  }) {
    return prisma.$transaction(async (tx) => {
      const [reemplazo] = await Promise.all([
        tx.reemplazo.create({
          data: { ...data, activo: true },
        }),
        tx.claseProgramada.update({
          where: { id: data.claseId },
          data:  { estado: "REEMPLAZADA" },
        }),
      ])
      return reemplazo
    })
  },

  eliminar(id: number, claseId: number) {
    return prisma.$transaction([
      prisma.reemplazo.update({
        where: { id },
        data:  { activo: false, deletedAt: new Date() },
      }),
      prisma.claseProgramada.update({
        where: { id: claseId },
        data:  { estado: "PROGRAMADA" },
      }),
    ])
  },
}