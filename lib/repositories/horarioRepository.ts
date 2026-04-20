// lib/repositories/horarioRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"] as const
export const DIA_INDEX = ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"]

export function rangoDeSemana(semana: string): { lunes: Date; domingo: Date } {
  const fecha = new Date(semana + "T12:00:00.000Z")
  const dia   = fecha.getUTCDay() === 0 ? 7 : fecha.getUTCDay()
  const lunes = new Date(fecha)
  lunes.setUTCDate(fecha.getUTCDate() - dia + 1)
  lunes.setUTCHours(0, 0, 0, 0)
  const domingo = new Date(lunes)
  domingo.setUTCDate(lunes.getUTCDate() + 6)
  domingo.setUTCHours(23, 59, 59, 999)
  return { lunes, domingo }
}

const claseInclude = {
  modulo:   true,
  unidad:   { select: { nombre: true, tipo: true } },
  comision: { select: { nombre: true, id: true } },
  asignacion: {
    select: {
      identificadorEstructural: true,
      agente: { select: { nombre: true, apellido: true } },
    },
  },
  reemplazos: {
    where: { activo: true },
    select: {
      id:          true,
      observacion: true,
      asignacionSuplente: {
        select: { agente: { select: { nombre: true, apellido: true } } },
      },
    },
  },
}

export const horarioRepository = {

  listarSemana(tenantId: number, lunes: Date, domingo: Date, filtros: {
    asignacionId?: number
    unidadId?:     number
    comisionId?:   number
  }) {
    const where: Prisma.ClaseProgramadaWhereInput = {
      institucionId: tenantId,
      fecha:         { gte: lunes, lte: domingo },
    }
    if (filtros.asignacionId) where.asignacionId = filtros.asignacionId
    if (filtros.unidadId)     where.unidadId     = filtros.unidadId
    if (filtros.comisionId)   where.comisionId   = filtros.comisionId

    return prisma.claseProgramada.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { modulo: { hora_desde: "asc" } }],
      include: claseInclude,
    })
  },

  listarSemanaInstitucion(tenantId: number, lunes: Date, domingo: Date) {
    return prisma.claseProgramada.findMany({
      where: {
        institucionId: tenantId,
        fecha:         { gte: lunes, lte: domingo },
      },
      orderBy: [{ fecha: "asc" }, { modulo: { hora_desde: "asc" } }],
      include: claseInclude,
    })
  },
}