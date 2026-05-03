// lib/repositories/cargoRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const cargoRepository = {
  listar(tenantId: number) {
    return prisma.cargo.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.cargo.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.cargo.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })
  },

  crear(
    tenantId: number,
    data: {
      numeroCargo?: number
      tipoCargo?: string
      materiaId?: number
      unidadId?: number
      comisionId?: number
      observacion?: string
    }
  ) {
    return prisma.cargo.create({
      data: {
        institucionId: tenantId,
        numeroCargo: data.numeroCargo,
        tipoCargo: data.tipoCargo,
        materiaId: data.materiaId,
        unidadId: data.unidadId,
        comisionId: data.comisionId,
        observacion: data.observacion,
      },
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.CargoUpdateInput
  ) {
    const existente = await prisma.cargo.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!existente) return null

    return prisma.cargo.update({
      where: {
        id: existente.id,
      },
      data,
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.cargo.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!existente) return null

    return prisma.cargo.update({
      where: {
        id: existente.id,
      },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },
}