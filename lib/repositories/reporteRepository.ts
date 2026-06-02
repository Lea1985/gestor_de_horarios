// lib/repositories/reporteRepository.ts
import prisma from "@/lib/prisma"

export const reporteRepository = {
  obtenerAgente(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: { id: agenteId, institucionId: tenantId },
      select: { id: true, nombre: true, apellido: true, documento: true, email: true },
    })
  },

  async listarAsignaciones(agenteId: number, tenantId: number) {
    const titulares = await prisma.titularAsignacion.findMany({
      where: {
        agenteId,
        institucionId: tenantId,
        activo: true,
        fecha_hasta: null,
      },
      select: {
        asignacion: {
          select: {
            id: true,
            identificadorEstructural: true,
            unidad: { select: { nombre: true } },
          },
        },
      },
    })
    return titulares.map(t => t.asignacion)
  },

  // ✅ Optimizado con groupBy y manejo de array vacío
  async obtenerResumenClasesPorAsignaciones(
    asignacionIds: number[],
    rango: { gte: Date; lte: Date }
  ) {
    if (asignacionIds.length === 0) {
      return { PROGRAMADA: 0, DICTADA: 0, SUSPENDIDA: 0, REEMPLAZADA: 0, total: 0 }
    }
    const resultados = await prisma.claseProgramada.groupBy({
      by: ["estado"],
      where: {
        asignacionId: { in: asignacionIds },
        fecha: rango,
      },
      _count: { estado: true },
    })
    const resumen = {
      PROGRAMADA: 0,
      DICTADA: 0,
      SUSPENDIDA: 0,
      REEMPLAZADA: 0,
      total: 0,
    }
    for (const r of resultados) {
      resumen[r.estado] = r._count.estado
      resumen.total += r._count.estado
    }
    return resumen
  },

  // Métodos legacy (se mantienen por compatibilidad, pero se recomienda usar los nuevos)
  contarClases(asignacionIds: number[], rango: { gte: Date; lte: Date }) {
    return Promise.all([
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "PROGRAMADA" } }),
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "DICTADA" } }),
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "SUSPENDIDA" } }),
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "REEMPLAZADA" } }),
    ])
  },

  listarIncidencias(asignacionIds: number[], desde: Date, hasta: Date) {
    return prisma.incidencia.findMany({
      where: {
        asignacionId: { in: asignacionIds },
        fecha_desde: { lte: hasta },
        fecha_hasta: { gte: desde },
        activo: true,
      },
      select: {
        id: true,
        fecha_desde: true,
        fecha_hasta: true,
        observacion: true,
        codigarioItem: { select: { codigo: true, nombre: true } },
      },
    })
  },

  contarReemplazos(asignacionIds: number[], rango: { gte: Date; lte: Date }) {
    return Promise.all([
      prisma.reemplazo.count({
        where: { activo: true, asignacionTitularId: { in: asignacionIds }, clase: { fecha: rango } },
      }),
      prisma.reemplazo.count({
        where: { activo: true, clase: { fecha: rango, asignacionId: { in: asignacionIds } } },
      }),
    ])
  },

  contarAsistencia(asignacionId: number, tenantId: number, rango: { gte: Date; lte: Date }) {
    const donde = { institucionId: tenantId, asignacionId, fecha: rango }
    return Promise.all([
      prisma.claseProgramada.count({ where: { ...donde, estado: "PROGRAMADA" } }),
      prisma.claseProgramada.count({ where: { ...donde, estado: "DICTADA" } }),
      prisma.claseProgramada.count({ where: { ...donde, estado: "SUSPENDIDA" } }),
      prisma.claseProgramada.count({ where: { ...donde, estado: "REEMPLAZADA" } }),
    ])
  },

  listarClases(asignacionId: number, tenantId: number, rango: { gte: Date; lte: Date }) {
    return prisma.claseProgramada.findMany({
      where: { institucionId: tenantId, asignacionId, fecha: rango },
      orderBy: { fecha: "asc" },
      select: {
        id: true,
        fecha: true,
        estado: true,
        modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
        unidad: { select: { nombre: true } },
        incidencia: {
          select: {
            id: true,
            fecha_desde: true,
            fecha_hasta: true,
            observacion: true,
            codigarioItem: { select: { codigo: true, nombre: true } },
          },
        },
      },
    })
  },

  listarReemplazos(tenantId: number, desde: Date, hasta: Date) {
    return prisma.reemplazo.findMany({
      where: {
        activo: true,
        clase: { institucionId: tenantId, fecha: { gte: desde, lte: hasta } },
      },
      orderBy: { createdAt: "asc" },
      include: {
        clase: {
          select: {
            fecha: true,
            estado: true,
            modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
            unidad: { select: { nombre: true } },
          },
        },
        asignacionTitular: {
          select: {
            identificadorEstructural: true,
            titularidades: {
              where: { activo: true, fecha_hasta: null },
              take: 1,
              select: { agente: { select: { nombre: true, apellido: true, documento: true } } },
            },
          },
        },
        agenteSuplente: { select: { nombre: true, apellido: true, documento: true } },
      },
    })
  },

  obtenerUnidad(unidadId: number, tenantId: number) {
    return prisma.unidadOrganizativa.findFirst({
      where: { id: unidadId, institucionId: tenantId },
      select: { id: true, nombre: true, tipo: true },
    })
  },

  listarClasesPorUnidad(unidadId: number, tenantId: number, rango: { gte: Date; lte: Date }) {
    return prisma.claseProgramada.findMany({
      where: { unidadId, institucionId: tenantId, fecha: rango },
      orderBy: { fecha: "asc" },
      include: {
        modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
        asignacion: {
          select: {
            identificadorEstructural: true,
            titularidades: {
              where: { activo: true, fecha_hasta: null },
              take: 1,
              select: { agente: { select: { nombre: true, apellido: true } } },
            },
          },
        },
        reemplazos: {
          where: { activo: true },
          select: { agenteSuplente: { select: { nombre: true, apellido: true } } },
        },
      },
    })
  },
}