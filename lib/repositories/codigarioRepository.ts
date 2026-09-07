// lib/repositories/codigarioRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
export class ItemDuplicadoError extends Error {
  constructor() {
    super("Ya existe un item con ese código en este codigario")
    this.name = "ItemDuplicadoError"
  }
}
export class ReactivacionRequeridaError extends Error {
  itemExistente: { nombre: string; descripcion: string | null; porcentajeComputable: number; deletedAt: Date }
  constructor(itemExistente: { nombre: string; descripcion: string | null; porcentajeComputable: number; deletedAt: Date }) {
    super("Ya existió un item con este código, eliminado previamente")
    this.name = "ReactivacionRequeridaError"
    this.itemExistente = itemExistente
  }
}
export const codigarioRepository = {
    listar(tenantId: number, incluirInactivos = false) {
    const ahora = new Date()
    return prisma.codigario.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirInactivos ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: { where: { deletedAt: null } } } },
        // UX-COD-002: items de este codigario con al menos una incidencia ya
        // cerrada (fecha_hasta pasada) — usado por el frontend para decidir si
        // se puede ofrecer "Eliminar", en vez del conteo de items activos.
        items: {
          where: { incidencias: { some: { deletedAt: null, fecha_hasta: { lt: ahora } } } },
          select: { id: true },
        },
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
  // UX-COD-002: reemplaza a tieneItems() como criterio de bloqueo de borrado.
  // Ya no importa si el codigario tiene items (activos o no), solo si alguno
  // de ellos fue usado en una incidencia ya cerrada.
  async tieneHistorialCerrado(codigarioId: number, tenantId: number) {
    const cantidad = await prisma.codigarioItem.count({
      where: {
        codigarioId,
        codigario: { institucionId: tenantId },
        incidencias: { some: { deletedAt: null, fecha_hasta: { lt: new Date() } } },
      },
    })
    return cantidad > 0
  },
  async itemTieneHistorialCerrado(itemId: number, tenantId: number) {
    const cantidad = await prisma.incidencia.count({
      where: {
        codigarioItemId: itemId,
        deletedAt: null,
        fecha_hasta: { lt: new Date() },
        codigarioItem: { codigario: { institucionId: tenantId } },
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
    },
    confirmarReactivacion = false
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
    // existe borrado lógico -> requiere confirmación explícita antes de reactivar
    // (UX-COD-003: antes se reactivaba en silencio, arrastrando el historial de
    // incidencias del item borrado sin que el operador lo supiera)
    if (!confirmarReactivacion) {
      throw new ReactivacionRequeridaError({
        nombre: existente.nombre,
        descripcion: existente.descripcion,
        porcentajeComputable: existente.porcentajeComputable,
        deletedAt: existente.deletedAt!,
      })
    }
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