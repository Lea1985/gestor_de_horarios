import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(value as string)
  return isNaN(d.getTime()) ? null : d
}

function solapa(inicioA: Date, finA: Date, inicioB: Date, finB: Date) {
  return inicioA <= finB && finA >= inicioB
}

// Include completo para la lista — incluye agente, curso y turno
// que la page necesita para mostrar y filtrar
const asignacionInclude = {
  agente: true,
 turno: true,
  unidad: true,
  materia: true,
  comision: {
    include: {
      curso: true,
      turno: true,
      unidad: true,
    },
  },
} satisfies Prisma.AsignacionInclude

export const distribucionRepository = {
  listar(tenantId: number) {
    return prisma.distribucionHoraria.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null,
      },
      include: {
        asignacion: {
          include: asignacionInclude,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.distribucionHoraria.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      include: {
        asignacion: {
          include: asignacionInclude,
        },
        distribucionModulos: {
          include: {
            moduloHorario: true,
          },
        },
      },
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.distribucionHoraria.findFirst({
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

  async verificarSolapamiento(
    tenantId: number,
    asignacionId: number,
    version: number,
    desde: Date,
    hasta: Date
  ) {
    const versionNumber = typeof version === "number" ? version : Number(version)

    if (!Number.isInteger(versionNumber)) {
      throw new Error("version inválida")
    }

    const versionExistente = await prisma.distribucionHoraria.findFirst({
      where: {
        institucionId: tenantId,
        asignacionId,
        version: versionNumber,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (versionExistente) return { tipo: "version" as const }

    const existentes = await prisma.distribucionHoraria.findMany({
      where: {
        institucionId: tenantId,
        asignacionId,
        deletedAt: null,
      },
    })

    const conflicto = existentes.find((d) => {
      const dInicio = new Date(d.fecha_vigencia_desde)
      const dFin    = d.fecha_vigencia_hasta ?? new Date("9999-12-31")
      return solapa(desde, hasta, dInicio, dFin)
    })

    if (conflicto) return { tipo: "solapamiento" as const }

    return null
  },

  crear(data: {
    tenantId:             number
    asignacionId:         number
    version:              number
    fecha_vigencia_desde: Date
    fecha_vigencia_hasta: Date | null
  }) {
    return prisma.distribucionHoraria.create({
      data: {
        institucionId:        data.tenantId,
        asignacionId:         data.asignacionId,
        version:              Number(data.version),
        fecha_vigencia_desde: data.fecha_vigencia_desde,
        fecha_vigencia_hasta: data.fecha_vigencia_hasta,
      },
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.DistribucionHorariaUpdateInput
  ) {
    const existente = await prisma.distribucionHoraria.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })

    if (!existente) return null

    return prisma.distribucionHoraria.update({
      where: { id },
      data,
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.distribucionHoraria.findFirst({
      where: { id, institucionId: tenantId },
      select: { id: true, deletedAt: true },
    })

    if (!existente)          return { ok: true, deleted: false }
    if (existente.deletedAt) return { ok: true, deleted: false }

    await prisma.distribucionHoraria.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    })

    return { ok: true, deleted: true }
  },

  async asignarModulos(
    distribucionId: number,
    tenantId: number,
    modulos: number[]
  ) {
    const modulosUnicos = [...new Set(modulos.map(Number))]

    if (modulosUnicos.some(isNaN)) return null

    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })

    if (!distribucion) return null

    if (modulosUnicos.length > 0) {
      const modulosValidos = await prisma.moduloHorario.findMany({
        where: {
          id: { in: modulosUnicos },
          institucionId: tenantId,
          deletedAt: null,
        },
        select: { id: true },
      })

      if (modulosValidos.length !== modulosUnicos.length) return null
    }

    return prisma.$transaction(async (tx) => {
      await tx.distribucionModulo.deleteMany({
        where: { distribucionHorariaId: distribucionId },
      })

      if (modulosUnicos.length > 0) {
        await tx.distribucionModulo.createMany({
          data: modulosUnicos.map((moduloHorarioId) => ({
            distribucionHorariaId: distribucionId,
            moduloHorarioId,
          })),
        })
      }

      return tx.distribucionModulo.findMany({
        where: { distribucionHorariaId: distribucionId },
        include: { moduloHorario: true },
      })
    })
  },

  parseDate,
}