// lib/repositories/codigarioRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const codigarioRepository = {
  listar(tenantId: number) {
    return prisma.codigario.findMany({
      where: { institucionId: tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.codigario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
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

  crearItem(
    codigarioId: number,
    tenantId: number,
    data: {
      codigo: string
      nombre: string
      descripcion?: string
    }
  ) {
    return prisma.codigarioItem
      .findFirst({
        where: {
          codigarioId,
          codigo: data.codigo,
          codigario: { institucionId: tenantId },
        },
      })
      .then(async (existente) => {
        // no existe -> crear
        if (!existente) {
          const codigario = await prisma.codigario.findFirst({
            where: {
              id: codigarioId,
              institucionId: tenantId,
              deletedAt: null,
            },
            select: { id: true },
          })

          if (!codigario) {
            throw new Error("Codigario no encontrado")
          }

          return prisma.codigarioItem.create({
            data: {
              codigarioId,
              ...data,
              activo: true,
              deletedAt: null,
            },
          })
        }

        // existe activo -> error
        if (!existente.deletedAt && existente.activo) {
          throw new Error("Ya existe un item con ese código")
        }

        // existe borrado lógico -> reactivar
        return prisma.codigarioItem.update({
          where: { id: existente.id },
          data: {
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            activo: true,
            deletedAt: null,
          },
        })
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
}