// lib/repositories/codigarioRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export class ItemDuplicadoError extends Error {
  constructor() {
    super("Ya existe un item con ese código en este codigario")
    this.name = "ItemDuplicadoError"
  }
}

export const codigarioRepository = {
  listar(tenantId: number, incluirInactivos = false) {
    return prisma.codigario.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirInactivos ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: { where: { deletedAt: null } } } },
      },
    })
  },

  obtenerPorId(id: number, tenantId: number, incluirInactivos = false) {
    return prisma.codigario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      include: {
        items: {
          where: incluirInactivos ? {} : { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.codigario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })
  },

  crear(tenantId: number, nombre: string, descripcion?: string) {
    return prisma.codigario.create({
      data: { nombre, descripcion, institucionId: tenantId },
    })
  },

  async tieneItems(codigarioId: number, tenantId: number) {
    const cantidad = await prisma.codigarioItem.count({
      where: {
        codigarioId,
        codigario: {
          institucionId: tenantId,
        },
      },
    })

    return cantidad > 0
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.CodigarioUpdateInput
  ) {
    const existente = await prisma.codigario.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Codigario no encontrado")
    }

    return prisma.codigario.update({
      where: { id: existente.id },
      data,
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.codigario.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Codigario no encontrado")
    }

    return prisma.codigario.update({
      where: { id: existente.id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    })
  },

  async reactivar(id: number, tenantId: number) {
    const existente = await prisma.codigario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: { not: null } },
      select: { id: true, nombre: true },
    })

    if (!existente) return null

    // Si ya existe otro codigario activo con el mismo nombre, no se puede reactivar
    const nombreDuplicado = await prisma.codigario.findFirst({
      where: {
        institucionId: tenantId,
        nombre: existente.nombre,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    })

    if (nombreDuplicado) {
      throw new Error(`Ya existe un codigario activo con el nombre "${existente.nombre}"`)
    }

    return prisma.codigario.update({
      where: { id },
      data: { activo: true, deletedAt: null },
    })
  },

  // Items

  listarItems(codigarioId: number, tenantId: number) {
    return prisma.codigarioItem.findMany({
      where: {
        codigarioId,
        deletedAt: null,
        codigario: { institucionId: tenantId },
      },
      orderBy: { createdAt: "asc" },
    })
  },

  obtenerItem(itemId: number, tenantId: number) {
    return prisma.codigarioItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null,
        codigario: { institucionId: tenantId },
      },
    })
  },

  existeItem(itemId: number, tenantId: number) {
    return prisma.codigarioItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null,
        codigario: { institucionId: tenantId },
      },
      select: {
        id: true,
        deletedAt: true,
      },
    })
  },

  async crearItem(
    codigarioId: number,
    tenantId: number,
    data: {
      codigo: string
      nombre: string
      descripcion?: string
      porcentajeComputable?: number

    }
  ) {
    const existente = await prisma.codigarioItem.findFirst({
      where: {
        codigarioId,
        codigo: data.codigo,
        codigario: { institucionId: tenantId },
      },
    })

    // no existe -> crear
    if (!existente) {
      const codigario = await prisma.codigario.findFirst({
        where: { id: codigarioId, institucionId: tenantId, deletedAt: null },
        select: { id: true },
      })

      if (!codigario) throw new Error("Codigario no encontrado")

      return prisma.codigarioItem.create({
        data: { codigarioId, ...data, activo: true, deletedAt: null },
      })
    }

    // existe activo -> error tipado (antes: Error genérico, no lo distinguía la ruta)
    if (!existente.deletedAt && existente.activo) {
      throw new ItemDuplicadoError()
    }

    // existe borrado lógico -> reactivar
    return prisma.codigarioItem.update({
      where: { id: existente.id },
      data: { ...data, activo: true, deletedAt: null },
    })
  },

  async actualizarItem(
    itemId: number,
    tenantId: number,
    data: Prisma.CodigarioItemUpdateInput
  ) {
    const existente = await prisma.codigarioItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null,
        codigario: { institucionId: tenantId },
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Item no encontrado")
    }

    return prisma.codigarioItem.update({
      where: { id: existente.id },
      data,
    })
  },

  async eliminarItem(itemId: number, tenantId: number) {
    const existente = await prisma.codigarioItem.findFirst({
      where: {
        id: itemId,
        codigario: { institucionId: tenantId },
      },
      select: {
        id: true,
        deletedAt: true,
      },
    })

    if (!existente || existente.deletedAt) {
      return { ok: true, deleted: false }
    }

    await prisma.codigarioItem.update({
      where: { id: existente.id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    })

    return { ok: true, deleted: true }
  },

  async reactivarItem(itemId: number, tenantId: number) {
    const existente = await prisma.codigarioItem.findFirst({
      where: {
        id: itemId,
        codigario: { institucionId: tenantId },
      },
      select: { id: true, deletedAt: true },
    })

    if (!existente || !existente.deletedAt) return null

    return prisma.codigarioItem.update({
      where: { id: existente.id },
      data: {
        activo: true,
        deletedAt: null,
      },
    })
  },
}