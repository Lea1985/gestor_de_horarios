//lib/repositories/periodoOperativoRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const periodoOperativoSelect = {
  id: true,
  institucionId: true,
  nombre: true,
  fecha_desde: true,
  fecha_hasta: true,
  vigente: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
}

export const periodoOperativoRepository = {

  listar(tenantId: number, incluirEliminados = false) {
    return prisma.periodoOperativo.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirEliminados ? {} : { deletedAt: null }),
      },
      select: periodoOperativoSelect,
      orderBy: [
        { vigente: "desc" },
        { fecha_desde: "desc" },
      ],
    })
  },

  obtenerPorId(
    periodoId: number,
    tenantId: number,
    incluirEliminados = false
  ) {
    return prisma.periodoOperativo.findFirst({
      where: {
        id: periodoId,
        institucionId: tenantId,
        ...(incluirEliminados ? {} : { deletedAt: null }),
      },
      select: periodoOperativoSelect,
    })
  },

  existeEnTenant(periodoId: number, tenantId: number) {
    return prisma.periodoOperativo.findFirst({
      where: {
        id: periodoId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  existeEliminado(periodoId: number, tenantId: number) {
    return prisma.periodoOperativo.findFirst({
      where: {
        id: periodoId,
        institucionId: tenantId,
        deletedAt: { not: null },
      },
      select: { id: true },
    })
  },

  crear(data: {
    tenantId: number
    nombre: string
    fecha_desde: Date
    fecha_hasta: Date
    vigente?: boolean
  }) {
    return prisma.periodoOperativo.create({
      data: {
        institucionId: data.tenantId,
        nombre: data.nombre,
        fecha_desde: data.fecha_desde,
        fecha_hasta: data.fecha_hasta,
        vigente: data.vigente ?? false,
      },
      select: periodoOperativoSelect,
    })
  },

  actualizar(
    periodoId: number,
    tenantId: number,
    data: {
      nombre?: string
      fecha_desde?: Date
      fecha_hasta?: Date
    }
  ) {
    const dataPeriodo: Prisma.PeriodoOperativoUpdateInput = {}

    if (data.nombre !== undefined) {
      dataPeriodo.nombre = data.nombre
    }

    if (data.fecha_desde !== undefined) {
      dataPeriodo.fecha_desde = data.fecha_desde
    }

    if (data.fecha_hasta !== undefined) {
      dataPeriodo.fecha_hasta = data.fecha_hasta
    }

    return prisma.periodoOperativo.update({
      where: {
        id: periodoId,
        institucionId: tenantId,
      },
      data: dataPeriodo,
      select: periodoOperativoSelect,
    })
  },

  eliminar(periodoId: number, tenantId: number) {
    return prisma.periodoOperativo.updateMany({
      where: {
        id: periodoId,
        institucionId: tenantId,
      },
      data: {
        vigente: false,
        deletedAt: new Date(),
      },
    })
  },

  reactivar(periodoId: number, tenantId: number) {
    return prisma.periodoOperativo.updateMany({
      where: {
        id: periodoId,
        institucionId: tenantId,
      },
      data: {
        deletedAt: null,
      },
    })
  },

  obtenerVigente(tenantId: number) {
    return prisma.periodoOperativo.findFirst({
      where: {
        institucionId: tenantId,
        vigente: true,
        deletedAt: null,
      },
      select: periodoOperativoSelect,
    })
  },

  setActivePeriod(
    tenantId: number,
    nuevoPeriodoId: number
  ) {
    return prisma.$transaction(async (tx) => {

      const nuevoPeriodo = await tx.periodoOperativo.findFirst({
        where: {
          id: nuevoPeriodoId,
          institucionId: tenantId,
          deletedAt: null,
        },
      })

      if (!nuevoPeriodo) {
        throw new Error("El período no existe o no pertenece a esta institución")
      }

      await tx.periodoOperativo.updateMany({
        where: {
          institucionId: tenantId,
          vigente: true,
          deletedAt: null,
        },
        data: {
          vigente: false,
        },
      })

      return tx.periodoOperativo.update({
        where: {
          id: nuevoPeriodoId,
        },
        data: {
          vigente: true,
        },
        select: periodoOperativoSelect,
      })
    })
  },
}