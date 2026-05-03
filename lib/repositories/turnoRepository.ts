// lib/repositories/turnoRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const turnoRepository = {
  // =========================
  // TURNOS
  // =========================

  listar(tenantId: number) {
    return prisma.turno.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null,
      },
      orderBy: {
        horaInicio: "asc",
      },
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
}