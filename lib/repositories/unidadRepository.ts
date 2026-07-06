// lib/repositories/unidadRepository.ts

import prisma from "@/lib/prisma"
import { TipoUnidad, Prisma } from "@prisma/client"

export const unidadRepository = {
  listar(tenantId: number, incluirInactivos = false) {
    return prisma.unidadOrganizativa.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirInactivos ? {} : { deletedAt: null }),
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

  async reactivar(id: number, tenantId: number) {
    const existente = await prisma.unidadOrganizativa.findFirst({
      where: { id, institucionId: tenantId, deletedAt: { not: null } },
      select: { id: true, codigoUnidad: true },
    })
 
    if (!existente) return null
 
    // Si ya existe otra unidad activa con el mismo código, no se puede reactivar
    const duplicado = await prisma.unidadOrganizativa.findFirst({
      where: {
        institucionId: tenantId,
        codigoUnidad: existente.codigoUnidad,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    })
 
    if (duplicado) {
      throw new Error(`Ya existe una unidad activa con el código ${existente.codigoUnidad}`)
    }
 
    return prisma.unidadOrganizativa.update({
      where: { id },
      data: { activo: true, deletedAt: null },
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