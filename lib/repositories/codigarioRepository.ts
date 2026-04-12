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
        items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
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

  actualizar(id: number, data: Prisma.CodigarioUpdateInput) {
    return prisma.codigario.update({ where: { id }, data })
  },

  eliminar(id: number) {
    return prisma.codigario.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    })
  },

  // Items
  listarItems(codigarioId: number, tenantId: number) {
    return prisma.codigarioItem.findMany({
      where: { codigarioId, deletedAt: null, codigario: { institucionId: tenantId } },
      orderBy: { createdAt: "asc" },
    })
  },

  obtenerItem(itemId: number, tenantId: number) {
    return prisma.codigarioItem.findFirst({
      where: { id: itemId, deletedAt: null, codigario: { institucionId: tenantId } },
    })
  },

  existeItem(itemId: number, tenantId: number) {
    return prisma.codigarioItem.findFirst({
      where: { id: itemId, deletedAt: null, codigario: { institucionId: tenantId } },
      select: { id: true, deletedAt: true },
    })
  },

  crearItem(codigarioId: number, data: { codigo: string; nombre: string; descripcion?: string }) {
    return prisma.codigarioItem.create({
      data: { codigarioId, ...data },
    })
  },

  actualizarItem(itemId: number, data: Prisma.CodigarioItemUpdateInput) {
    return prisma.codigarioItem.update({ where: { id: itemId }, data })
  },

  eliminarItem(itemId: number) {
    return prisma.codigarioItem.findFirst({
      where: { id: itemId },
      select: { id: true, deletedAt: true },
    }).then(async (existente) => {
      if (!existente || existente.deletedAt) return { ok: true, deleted: false }
      await prisma.codigarioItem.update({
        where: { id: itemId },
        data: { deletedAt: new Date(), activo: false },
      })
      return { ok: true, deleted: true }
    })
  },
}