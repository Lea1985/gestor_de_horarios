
// lib/repositories/calendarioEscolarRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const calendarioEscolarSelect = {
  id:               true,
  institucionId:    true,
  periodoOperativoId: true,

  fecha:            true,
  descripcion:      true,

  esFeriado:        true,
  suspendeClases:   true,

  activo:           true,
  deletedAt:        true,

  createdAt:        true,
  updatedAt:        true,
}

export const calendarioEscolarRepository = {

  listar(
    tenantId: number,
    periodoOperativoId: number,
    incluirInactivos = false
  ) {

    return prisma.calendarioEscolar.findMany({

      where: {
        institucionId: tenantId,
        periodoOperativoId,

        ...(incluirInactivos
          ? {}
          : {
              activo: true,
              deletedAt: null,
            }),
      },

      select: calendarioEscolarSelect,

      orderBy: [
        { fecha: "asc" },
      ],
    })
  },

  obtenerPorId(calendarioId: number, tenantId: number) {
    return prisma.calendarioEscolar.findFirst({
      where: {
        id: calendarioId,
        institucionId: tenantId,
        activo: true,
        deletedAt: null,
      },

      select: calendarioEscolarSelect,
    })
  },

  existeEnTenant(calendarioId: number, tenantId: number) {
    return prisma.calendarioEscolar.findFirst({
      where: {
        id: calendarioId,
        institucionId: tenantId,
        activo: true,
        deletedAt: null,
      },

      select: { id: true },
    })
  },

  existeEliminado(calendarioId: number, tenantId: number) {
    return prisma.calendarioEscolar.findFirst({
      where: {
        id: calendarioId,
        institucionId: tenantId,
        activo: false,
      },
      select: { id: true, periodoOperativoId: true },
    })
  },

  crear(data: {
    tenantId: number
    periodoOperativoId: number

    fecha: Date
    descripcion: string

    esFeriado: boolean
    suspendeClases: boolean
  }) {

    return prisma.calendarioEscolar.create({

      data: {
        institucionId: data.tenantId,
        periodoOperativoId: data.periodoOperativoId,

        fecha: data.fecha,
        descripcion: data.descripcion,

        esFeriado: data.esFeriado,
        suspendeClases: data.suspendeClases,
      },

      select: calendarioEscolarSelect,
    })
  },

actualizar(
  calendarioId: number,
  tenantId: number,
  data: {
    fecha?: Date | string
    descripcion?: string
    esFeriado?: boolean
    suspendeClases?: boolean
  }
) {

  const dataCalendario: Prisma.CalendarioEscolarUpdateInput = {}

  if (data.fecha !== undefined) {
    const fecha = new Date(data.fecha)

    if (isNaN(fecha.getTime())) {
      throw new Error("Fecha inválida en actualizar calendarioEscolar")
    }

    dataCalendario.fecha = fecha
  }

  if (data.descripcion !== undefined)
    dataCalendario.descripcion = data.descripcion

  if (data.esFeriado !== undefined)
    dataCalendario.esFeriado = data.esFeriado

  if (data.suspendeClases !== undefined)
    dataCalendario.suspendeClases = data.suspendeClases

  return prisma.$transaction(async (tx) => {

    await tx.calendarioEscolar.updateMany({
      where: {
        id: calendarioId,
        institucionId: tenantId,
      },
      data: dataCalendario,
    })

    return tx.calendarioEscolar.findFirst({
      where: {
        id: calendarioId,
        institucionId: tenantId,
        activo: true,
        deletedAt: null,
      },
      select: calendarioEscolarSelect,
    })
  })
},

  eliminar(calendarioId: number, tenantId: number) {
    return prisma.calendarioEscolar.updateMany({
      where: {
        id: calendarioId,
        institucionId: tenantId,
      },

      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },

  listarConInactivos(tenantId: number) {
    return prisma.calendarioEscolar.findMany({
      where: {
        institucionId: tenantId,
      },

      select: calendarioEscolarSelect,

      orderBy: [
        { activo: "desc" },
        { fecha: "asc" },
      ],
    })
  },

  reactivar(calendarioId: number, tenantId: number) {
    return prisma.calendarioEscolar.updateMany({
      where: {
        id: calendarioId,
        institucionId: tenantId,
      },

      data: {
        activo: true,
        deletedAt: null,
      },
    })
  },
}

