// lib/repositories/moduloHorarioRepository.ts

import prisma from "@/lib/prisma"
import { Dias, Prisma } from "@prisma/client"

export const moduloHorarioRepository = {

  listar(tenantId: number) {
    return prisma.moduloHorario.findMany({
      where:   { institucionId: tenantId, deletedAt: null },
      orderBy: [{ dia_semana: "asc" }, { hora_desde: "asc" }],
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.moduloHorario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.moduloHorario.findFirst({
      where:  { id, institucionId: tenantId },
      select: { id: true, deletedAt: true },
    })
  },

  haySolapamiento(tenantId: number, dia_semana: Dias, hora_desde: number, hora_hasta: number, excludeId?: number) {
    const where: Prisma.ModuloHorarioWhereInput = {
      institucionId: tenantId,
      dia_semana,
      deletedAt:     null,
      AND: [
        { hora_desde: { lt: hora_hasta } },
        { hora_hasta: { gt: hora_desde } },
      ],
    }
    if (excludeId) where.id = { not: excludeId }
    return prisma.moduloHorario.count({ where }).then(c => c > 0)
  },

  crear(data: {
    tenantId:   number
    dia_semana: Dias
    hora_desde: number
    hora_hasta: number
    turnoId?:   number | null
  }) {
    return prisma.moduloHorario.create({
      data: {
        institucionId: data.tenantId,
        dia_semana:    data.dia_semana,
        hora_desde:    data.hora_desde,
        hora_hasta:    data.hora_hasta,
        turnoId:       data.turnoId ?? null,
        activo:        true,
      },
    })
  },

  obtenerPorDatosDuplicado(tenantId: number, dia_semana: Dias, hora_desde: number, hora_hasta: number) {
    return prisma.moduloHorario.findFirst({
      where: { institucionId: tenantId, dia_semana, hora_desde, hora_hasta },
    })
  },

  actualizar(id: number, data: Prisma.ModuloHorarioUpdateInput) {
    return prisma.moduloHorario.update({ where: { id }, data })
  },

  eliminar(id: number) {
    return prisma.moduloHorario.update({
      where: { id },
      data:  { deletedAt: new Date(), activo: false },
    })
  },
}