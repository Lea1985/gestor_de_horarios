// lib/repositories/materiaRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const materiaRepository = {
  listar(tenantId: number, cursoId?: number) {
    return prisma.materia.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null,
        ...(cursoId ? { cursoId } : {}),
      },
      orderBy: {
        nombre: "asc",
      },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.materia.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.materia.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  crear(tenantId: number, nombre: string, cursoId: number) {
    return prisma.materia.create({
      data: {
        institucionId: tenantId,
        nombre,
        cursoId,
      },
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.MateriaUpdateInput
  ) {
    const existente = await prisma.materia.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) return null

    return prisma.materia.update({
      where: { id: existente.id },
      data,
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.materia.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) return null

    return prisma.materia.update({
      where: { id: existente.id },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },
}