import prisma from "@/lib/prisma"

export const reporteRepository = {

  obtenerAgente(agenteId: number, tenantId: number) {
    return prisma.agenteInstitucion.findFirst({
      where: { agenteId, institucionId: tenantId },
      include: {
        agente: {
          select: {
            nombre: true,
            apellido: true,
            documento: true,
            email: true,
          },
        },
      },
    })
  },

  listarAsignaciones(agenteId: number, tenantId: number) {
    return prisma.asignacion.findMany({
      where: { agenteId, institucionId: tenantId, activo: true },
      select: {
        id: true,
        identificadorEstructural: true,
        unidad: { select: { nombre: true } },
      },
    })
  },

  contarClases(asignacionIds: number[], rango: any) {
    return Promise.all([
      prisma.claseProgramada.count({
        where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "PROGRAMADA" },
      }),
      prisma.claseProgramada.count({
        where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "DICTADA" },
      }),
      prisma.claseProgramada.count({
        where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "SUSPENDIDA" },
      }),
      prisma.claseProgramada.count({
        where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "REEMPLAZADA" },
      }),
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
        codigarioItem: {
          select: { codigo: true, nombre: true },
        },
      },
    })
  },

  contarReemplazos(asignacionIds: number[], rango: any) {
    return Promise.all([
      prisma.reemplazo.count({
        where: {
          activo: true,
          asignacionTitularId: { in: asignacionIds },
          clase: { fecha: rango },
        },
      }),
      prisma.reemplazo.count({
        where: {
          activo: true,
          asignacionSuplenteId: { in: asignacionIds },
          clase: { fecha: rango },
        },
      }),
    ])
  },
  contarAsistencia(asignacionId: number, tenantId: number, rango: any) {
  const donde = {
    institucionId: tenantId,
    asignacionId,
    fecha: rango,
  }

  return Promise.all([
    prisma.claseProgramada.count({ where: { ...donde, estado: "PROGRAMADA" } }),
    prisma.claseProgramada.count({ where: { ...donde, estado: "DICTADA" } }),
    prisma.claseProgramada.count({ where: { ...donde, estado: "SUSPENDIDA" } }),
    prisma.claseProgramada.count({ where: { ...donde, estado: "REEMPLAZADA" } }),
  ])
  },

  listarClases(asignacionId: number, tenantId: number, rango: any) {
    return prisma.claseProgramada.findMany({
        where: {
        institucionId: tenantId,
        asignacionId,
        fecha: rango,
        },
        orderBy: { fecha: "asc" },
        select: {
        id: true,
        fecha: true,
        estado: true,
        modulo: {
            select: {
            dia_semana: true,
            hora_desde: true,
            hora_hasta: true,
            },
        },
        unidad: { select: { nombre: true } },
        incidencia: {
            select: {
            id: true,
            fecha_desde: true,
            fecha_hasta: true,
            observacion: true,
            codigarioItem: {
                select: { codigo: true, nombre: true },
            },
            },
        },
        },
    })
  },
  listarReemplazos(tenantId: number, desde: Date, hasta: Date) {
  return prisma.reemplazo.findMany({
    where: {
      activo: true,
      clase: {
        institucionId: tenantId,
        fecha: {
          gte: desde,
          lte: hasta,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      clase: {
        select: {
          fecha: true,
          estado: true,
          modulo: {
            select: {
              dia_semana: true,
              hora_desde: true,
              hora_hasta: true,
            },
          },
          unidad: { select: { nombre: true } },
        },
      },
      asignacionTitular: {
        select: {
          identificadorEstructural: true,
          agente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
            },
          },
        },
      },
      asignacionSuplente: {
        select: {
          identificadorEstructural: true,
          agente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
            },
          },
        },
      },
    },
  })
},
obtenerUnidad(unidadId: number, tenantId: number) {
  return prisma.unidadOrganizativa.findFirst({
    where: { id: unidadId, institucionId: tenantId },
    select: { id: true, nombre: true, tipo: true },
  })
},

listarClasesPorUnidad(
  unidadId: number,
  tenantId: number,
  rango: any
) {
  return prisma.claseProgramada.findMany({
    where: {
      unidadId,
      institucionId: tenantId,
      fecha: rango,
    },
    orderBy: { fecha: "asc" },
    include: {
      modulo: {
        select: {
          dia_semana: true,
          hora_desde: true,
          hora_hasta: true,
        },
      },
      asignacion: {
        select: {
          identificadorEstructural: true,
          agente: {
            select: { nombre: true, apellido: true },
          },
        },
      },
      reemplazos: {
        where: { activo: true },
        select: {
          asignacionSuplente: {
            select: {
              agente: {
                select: { nombre: true, apellido: true },
              },
            },
          },
        },
      },
    },
  })
}
}