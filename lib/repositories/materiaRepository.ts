// lib/repositories/materiaRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const materiaRepository = {
  listar(tenantId: number, cursoId?: number, incluirInactivos = false) {
    return prisma.materia.findMany({
      where: {
        institucionId: tenantId,
        ...(cursoId ? { cursoId } : {}),
        ...(incluirInactivos ? {} : { activo: true, deletedAt: null }),
      },
      orderBy: [
        { nombre: "asc" },
      ],
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

    if (!existente) {
      throw new Error("Materia no encontrada")
    }

    return prisma.materia.update({
      where: { id: existente.id },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },

  async reactivar(id: number, tenantId: number) {
    const existente = await prisma.materia.findFirst({
      where: { id, institucionId: tenantId, deletedAt: { not: null } },
      select: { id: true, nombre: true, cursoId: true },
    })

    if (!existente) return null

    const duplicado = await prisma.materia.findFirst({
      where: {
        institucionId: tenantId,
        nombre: existente.nombre,
        cursoId: existente.cursoId,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    })

    if (duplicado) {
      throw new Error(`Ya existe una materia activa con el nombre "${existente.nombre}" en este curso`)
    }

    return prisma.materia.update({
      where: { id },
      data: { activo: true, deletedAt: null },
    })
  },
}