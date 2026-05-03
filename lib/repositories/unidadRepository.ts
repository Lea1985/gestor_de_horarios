// lib/repositories/unidadRepository.ts

import prisma from "@/lib/prisma"
import { TipoUnidad, Prisma } from "@prisma/client"

export const unidadRepository = {
  listar(tenantId: number) {
    return prisma.unidadOrganizativa.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null,
      },
      orderBy: { codigoUnidad: "asc" },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.unidadOrganizativa.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
    })
  },

  crear(data: {
    tenantId: number
    codigoUnidad: number
    nombre: string
    tipo: TipoUnidad | null
  }) {
    return prisma.unidadOrganizativa.create({
      data: {
        institucionId: data.tenantId,
        codigoUnidad: data.codigoUnidad,
        nombre: data.nombre,
        tipo: data.tipo,
      },
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.UnidadOrganizativaUpdateInput
  ) {
    const existente = await prisma.unidadOrganizativa.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Unidad no encontrada")
    }

    return prisma.unidadOrganizativa.update({
      where: { id: existente.id },
      data,
    })
  },

  async softDelete(id: number, tenantId: number) {
    const existente = await prisma.unidadOrganizativa.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Unidad no encontrada")
    }

    return prisma.unidadOrganizativa.update({
      where: { id: existente.id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    })
  },

  existe(id: number, tenantId: number) {
    return prisma.unidadOrganizativa.findFirst({
      where: {
        id,
        institucionId: tenantId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    })
  },
}