// lib/repositories/comisionRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const comisionRepository = {
  listar(tenantId: number, incluirInactivos = false) {
    return prisma.comision.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirInactivos ? {} : { deletedAt: null }),
      },
      include: {
        curso: true,
        turno: true,
        unidad: true,
      },
      orderBy: [
        { curso: { nombre: "asc" } },
        { nombre: "asc" },
      ],
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.comision.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      include: {
        curso: true,
        turno: true,
        unidad: true,
      },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.comision.findFirst({
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
      cursoId: number
      turnoId: number
      unidadId?: number | null
      nombre: string
      descripcion?: string
    }
  ) {
    return prisma.comision.create({
      data: {
        institucionId: tenantId,
        cursoId: data.cursoId,
        turnoId: data.turnoId,
        unidadId: data.unidadId ?? null,
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
      include: {
        curso: true,
        turno: true,
        unidad: true,
      },
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.ComisionUpdateInput
  ) {
    const existente = await prisma.comision.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Comisión no encontrada")
    }

    return prisma.comision.update({
      where: { id: existente.id },
      data,
      include: {
        curso: true,
        turno: true,
        unidad: true,
      },
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.comision.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
 
    if (!existente) {
      throw new Error("Comisión no encontrada")
    }
 
    return prisma.comision.update({
      where: { id: existente.id },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },

    async reactivar(id: number, tenantId: number) {
    const existente = await prisma.comision.findFirst({
      where: { id, institucionId: tenantId, deletedAt: { not: null } },
      select: { id: true, nombre: true, cursoId: true },
    })
 
    if (!existente) return null
 
    // Si ya existe otra comisión activa con el mismo nombre en el mismo curso, no se puede reactivar
    const duplicado = await prisma.comision.findFirst({
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
      throw new Error(`Ya existe una comisión activa con el nombre "${existente.nombre}" en este curso`)
    }
 
    return prisma.comision.update({
      where: { id },
      data: { activo: true, deletedAt: null },
      include: {
        curso: true,
        turno: true,
        unidad: true,
      },
    })
  },
}