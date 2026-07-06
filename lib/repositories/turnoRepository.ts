// lib/repositories/turnoRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const turnoRepository = {
  // =========================
  // TURNOS
  // =========================

  listar(tenantId: number, incluirInactivos = false) {
    return prisma.turno.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirInactivos ? {} : { deletedAt: null }),
      },
      orderBy: { horaInicio: "asc" },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.turno.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.turno.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  async crear(
    tenantId: number,
    data: {
      nombre: string
      horaInicio: number
      horaFin: number
    }
  ) {
    const nombreNormalizado = data.nombre.trim()

    const existente = await prisma.turno.findFirst({
      where: {
        institucionId: tenantId,
        nombre: nombreNormalizado,
      },
    })

    // No existe -> crear nuevo
    if (!existente) {
      return prisma.turno.create({
        data: {
          institucionId: tenantId,
          nombre: nombreNormalizado,
          horaInicio: data.horaInicio,
          horaFin: data.horaFin,
          activo: true,
        },
      })
    }

    // Existe activo
    if (!existente.deletedAt && existente.activo) {
      throw new Error("Ya existe un turno con ese nombre")
    }

    // Existe eliminado lógico -> reactivar
    return prisma.turno.update({
      where: { id: existente.id },
      data: {
        nombre: nombreNormalizado,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        activo: true,
        deletedAt: null,
      },
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.TurnoUpdateInput
  ) {
    const existente = await prisma.turno.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Turno no encontrado")
    }

    return prisma.turno.update({
      where: { id: existente.id },
      data,
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.turno.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Turno no encontrado")
    }

    return prisma.turno.update({
      where: { id: existente.id },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },

  async reactivar(id: number, tenantId: number) {
    const existente = await prisma.turno.findFirst({
      where: { id, institucionId: tenantId, deletedAt: { not: null } },
      select: { id: true, nombre: true },
    })
 
    if (!existente) return null
 
    // Si ya existe otro turno activo con el mismo nombre, no se puede reactivar
    const duplicado = await prisma.turno.findFirst({
      where: {
        institucionId: tenantId,
        nombre: existente.nombre,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    })
 
    if (duplicado) {
      throw new Error(`Ya existe un turno activo con el nombre "${existente.nombre}"`)
    }
 
    return prisma.turno.update({
      where: { id },
      data: { activo: true, deletedAt: null },
    })
  },
}