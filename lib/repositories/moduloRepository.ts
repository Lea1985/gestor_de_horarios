import prisma from "@/lib/prisma"
import { Prisma, Dias } from "@prisma/client"

async function haySolapamiento(
  tenantId: number,
  dia_semana: Dias,
  hora_desde: number,
  hora_hasta: number,
  excludeId?: number
): Promise<boolean> {
  const where: Prisma.ModuloHorarioWhereInput = {
    institucionId: tenantId,
    dia_semana,
    deletedAt: null,
    AND: [
      { hora_desde: { lt: hora_hasta } },
      { hora_hasta: { gt: hora_desde } },
    ],
  }
  if (excludeId) where.id = { not: excludeId }
  const count = await prisma.moduloHorario.count({ where })
  return count > 0
}

export const moduloRepository = {

  listar(tenantId: number) {
    return prisma.moduloHorario.findMany({
      where: { institucionId: tenantId, deletedAt: null },
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
      where: { id, institucionId: tenantId },
      select: { id: true, deletedAt: true },
    })
  },

  verificarTurno(turnoId: number, tenantId: number) {
    return prisma.turno.findFirst({
      where: { id: turnoId, institucionId: tenantId },
      select: { id: true },
    })
  },

  haySolapamiento,

  async crear(tenantId: number, data: {
    dia_semana: Dias
    hora_desde: number
    hora_hasta: number
    turnoId?:   number | null
  }) {
    return prisma.moduloHorario.create({
      data: {
        institucionId: tenantId,
        dia_semana:    data.dia_semana,
        hora_desde:    data.hora_desde,
        hora_hasta:    data.hora_hasta,
        turnoId:       data.turnoId ?? null,
        activo:        true,
      },
    })
  },

  actualizar(id: number, data: Prisma.ModuloHorarioUpdateInput) {
    return prisma.moduloHorario.update({ where: { id }, data })
  },

  eliminar(id: number) {
    return prisma.moduloHorario.findFirst({
      where: { id },
      select: { id: true, deletedAt: true },
    }).then(async (modulo) => {
      if (!modulo || modulo.deletedAt) return { ok: true, deleted: false }
      await prisma.moduloHorario.update({
        where: { id },
        data: { deletedAt: new Date(), activo: false },
      })
      return { ok: true, deleted: true }
    })
  },
}