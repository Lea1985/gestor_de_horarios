// lib/repositories/cursoRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const cursoRepository = {
  listar(tenantId: number) {
    return prisma.curso.findMany({
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
}