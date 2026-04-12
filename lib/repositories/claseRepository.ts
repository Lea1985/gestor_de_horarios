
// lib/repositories/claseRepository.ts
import prisma from "@/lib/prisma"
import { EstadoClase, Prisma } from "@prisma/client"

const DIA_MAP: Record<string, number> = {
  DOMINGO:   0,
  LUNES:     1,
  MARTES:    2,
  MIERCOLES: 3,
  JUEVES:    4,
  VIERNES:   5,
  SABADO:    6,
}

function generarFechas(diaSemana: string, desde: Date, hasta: Date): Date[] {
  const fechas: Date[] = []
  const diaTarget = DIA_MAP[diaSemana]
  const cursor = new Date(desde)
  while (cursor.getDay() !== diaTarget) cursor.setDate(cursor.getDate() + 1)
  while (cursor <= hasta) {
    fechas.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }
  return fechas
}

const claseIncludeFull = {
  modulo:   true,
  unidad:   true,
  comision: true,
  asignacion: {
    include: {
      agente: { select: { nombre: true, apellido: true, documento: true } },
    },
  },
  incidencia: {
    include: { codigarioItem: { select: { codigo: true, nombre: true } } },
  },
  reemplazos: {
    include: {
      asignacionTitular:  { select: { identificadorEstructural: true } },
      asignacionSuplente: { select: { identificadorEstructural: true } },
    },
  },
}

const claseIncludeList = {
  modulo:    { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
  unidad:    { select: { nombre: true, codigoUnidad: true } },
  comision:  { select: { id: true, nombre: true } },
  asignacion:{ select: { identificadorEstructural: true, agenteId: true } },
  incidencia:{ select: { id: true, fecha_desde: true, fecha_hasta: true, observacion: true } },
  reemplazos:{ select: { id: true, asignacionTitularId: true, asignacionSuplenteId: true } },
}

export const claseRepository = {

  listar(tenantId: number, filtros: {
    asignacionId?: number
    moduloId?:     number
    unidadId?:     number
    comisionId?:   number
    estado?:       EstadoClase
    fechaDesde?:   Date
    fechaHasta?:   Date
  }) {
    const where: Prisma.ClaseProgramadaWhereInput = { institucionId: tenantId }
    if (filtros.asignacionId) where.asignacionId = filtros.asignacionId
    if (filtros.moduloId)     where.moduloId     = filtros.moduloId
    if (filtros.unidadId)     where.unidadId     = filtros.unidadId
    if (filtros.comisionId)   where.comisionId   = filtros.comisionId
    if (filtros.estado)       where.estado       = filtros.estado
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {}
      if (filtros.fechaDesde) (where.fecha as Prisma.DateTimeFilter).gte = filtros.fechaDesde
      if (filtros.fechaHasta) (where.fecha as Prisma.DateTimeFilter).lte = filtros.fechaHasta
    }
    return prisma.claseProgramada.findMany({
      where,
      orderBy: { fecha: "asc" },
      include: claseIncludeList,
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.claseProgramada.findFirst({
      where: { id, institucionId: tenantId },
      include: claseIncludeFull,
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.claseProgramada.findFirst({
      where: { id, institucionId: tenantId },
      select: { id: true, asignacionId: true },
    })
  },

  actualizar(id: number, data: Partial<{ estado: EstadoClase; incidenciaId: number | null }>) {
    return prisma.claseProgramada.update({ where: { id }, data })
  },

  verificarIncidencia(incidenciaId: number, asignacionId: number) {
    return prisma.incidencia.findFirst({
      where: { id: incidenciaId, asignacionId, deletedAt: null },
      select: { id: true },
    })
  },

  async generarClases(tenantId: number, distribucionHorariaId: number, desde: Date, hasta: Date) {
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: { id: distribucionHorariaId, institucionId: tenantId, activo: true },
      include: {
        distribucionModulos: { include: { moduloHorario: true } },
        asignacion: { select: { id: true, unidadId: true, comisionId: true } },
      },
    })

    if (!distribucion) return null

    if (desde < distribucion.fecha_vigencia_desde) {
      throw new Error("fecha_desde es anterior a la vigencia de la distribución")
    }
    if (distribucion.fecha_vigencia_hasta && hasta > distribucion.fecha_vigencia_hasta) {
      throw new Error("fecha_hasta supera la vigencia de la distribución")
    }

    let creadas = 0
    let omitidas = 0

    for (const dm of distribucion.distribucionModulos) {
      const modulo = dm.moduloHorario
      const fechas = generarFechas(modulo.dia_semana, desde, hasta)

      for (const fecha of fechas) {
        const existente = await prisma.claseProgramada.findFirst({
          where: {
            institucionId: tenantId,
            asignacionId:  distribucion.asignacionId,
            moduloId:      modulo.id,
            unidadId:      distribucion.asignacion.unidadId,
            fecha,
          },
          select: { id: true },
        })

        if (existente) { omitidas++; continue }

        await prisma.claseProgramada.create({
          data: {
            institucionId: tenantId,
            asignacionId:  distribucion.asignacionId,
            moduloId:      modulo.id,
            unidadId:      distribucion.asignacion.unidadId,
            comisionId:    distribucion.asignacion.comisionId ?? null,
            fecha,
            estado:        "PROGRAMADA",
          },
        })
        creadas++
      }
    }

    return { distribucionHorariaId, creadas, omitidas }
  },
}