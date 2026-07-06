// lib/repositories/cursoRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const cursoRepository = {
  listar(tenantId: number, incluirInactivos = false) {
    return prisma.curso.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirInactivos ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "desc" },
    })
  },
 

  obtenerPorId(id: number, tenantId: number) {
    return prisma.curso.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.curso.findFirst({
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
      nombre: string
      descripcion?: string
    }
  ) {
    return prisma.curso.create({
      data: {
        institucionId: tenantId,
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.CursoUpdateInput
  ) {
    const existente = await prisma.curso.findFirst({
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

    return prisma.curso.update({
      where: {
        id: existente.id,
      },
      data,
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.curso.findFirst({
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

    return prisma.curso.update({
      where: {
        id: existente.id,
      },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },

    async reactivar(id: number, tenantId: number) {
    const existente = await prisma.curso.findFirst({
      where: { id, institucionId: tenantId, deletedAt: { not: null } },
      select: { id: true, nombre: true },
    })
 
    if (!existente) return null
 
    // Si ya existe otro curso activo con el mismo nombre, no se puede reactivar
    const duplicado = await prisma.curso.findFirst({
      where: {
        institucionId: tenantId,
        nombre: existente.nombre,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    })
 
    if (duplicado) {
      throw new Error(`Ya existe un curso activo con el nombre "${existente.nombre}"`)
    }
 
    return prisma.curso.update({
      where: { id },
      data: { activo: true, deletedAt: null },
    })
  },
}