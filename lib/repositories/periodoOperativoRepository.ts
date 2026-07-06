// lib/repositories/periodoOperativoRepository.ts
import prisma from "@/lib/prisma"
import { Prisma, EstadoPeriodo } from "@prisma/client"

export const periodoOperativoSelect = {
  id: true,
  institucionId: true,
  nombre: true,
  fecha_desde: true,
  fecha_hasta: true,
  estado: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
}

export const periodoOperativoRepository = {

  listar(tenantId: number, incluirEliminados = false) {
    return prisma.periodoOperativo.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirEliminados ? {} : { deletedAt: null }),
      },
      select: periodoOperativoSelect,
      orderBy: [{ fecha_desde: "desc" }],
    })
  },

  obtenerPorId(periodoId: number, tenantId: number, incluirEliminados = false) {
    return prisma.periodoOperativo.findFirst({
      where: {
        id: periodoId,
        institucionId: tenantId,
        ...(incluirEliminados ? {} : { deletedAt: null }),
      },
      select: periodoOperativoSelect,
    })
  },

  existeEnTenant(periodoId: number, tenantId: number) {
    return prisma.periodoOperativo.findFirst({
      where: { id: periodoId, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })
  },

  crear(data: {
    tenantId: number
    nombre: string
    fecha_desde: Date
    fecha_hasta: Date
    estado?: EstadoPeriodo
  }) {
    return prisma.periodoOperativo.create({
      data: {
        institucionId: data.tenantId,
        nombre: data.nombre,
        fecha_desde: data.fecha_desde,
        fecha_hasta: data.fecha_hasta,
        estado: data.estado ?? "BORRADOR",
      },
      select: periodoOperativoSelect,
    })
  },

  actualizar(
    periodoId: number,
    tenantId: number,
    data: { nombre?: string; fecha_desde?: Date; fecha_hasta?: Date }
  ) {
    const dataPeriodo: Prisma.PeriodoOperativoUpdateInput = {}
    if (data.nombre !== undefined)      dataPeriodo.nombre = data.nombre
    if (data.fecha_desde !== undefined) dataPeriodo.fecha_desde = data.fecha_desde
    if (data.fecha_hasta !== undefined) dataPeriodo.fecha_hasta = data.fecha_hasta

    return prisma.periodoOperativo.update({
      where: { id: periodoId, institucionId: tenantId },
      data: dataPeriodo,
      select: periodoOperativoSelect,
    })
  },

  eliminar(periodoId: number, tenantId: number) {
    return prisma.periodoOperativo.updateMany({
      where: { id: periodoId, institucionId: tenantId },
      data: { deletedAt: new Date() },
    })
  },

  reactivar(periodoId: number, tenantId: number) {
    return prisma.periodoOperativo.updateMany({
      where: { id: periodoId, institucionId: tenantId },
      data: { deletedAt: null },
    })
  },

  // "Vigente" ahora es sinónimo de estado ACTIVO.
  obtenerVigente(tenantId: number) {
    return prisma.periodoOperativo.findFirst({
      where: { institucionId: tenantId, estado: "ACTIVO", deletedAt: null },
      select: periodoOperativoSelect,
    })
  },

  verificarSuperposicion(
    tenantId: number,
    fechaDesde: Date,
    fechaHasta: Date,
    excludeId?: number
  ) {
    return prisma.periodoOperativo.findFirst({
      where: {
        institucionId: tenantId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        fecha_desde: { lte: fechaHasta },
        fecha_hasta: { gte: fechaDesde },
      },
      select: { id: true, nombre: true, fecha_desde: true, fecha_hasta: true },
    })
  },
}
