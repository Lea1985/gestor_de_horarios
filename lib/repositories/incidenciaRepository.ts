// lib/repositories/incidenciaRepository.ts
import prisma from "@/lib/prisma"

const incidenciaInclude = {
  codigarioItem: true,
  padre: {
    include: {
      codigarioItem: true,
      asignacion: {
        include: {
          titularidades: {
            orderBy: { fecha_desde: "desc" as const },
            include: { agente: true },
            take: 1,
          },
          unidad: true,
          comision: { include: { curso: true } },
        },
      },
      // NUEVO: para mostrar quién era el suplente (B) en la incidencia padre
      ClaseProgramada: {
        where: { estado: "REEMPLAZADA" as const },
        include: {
          reemplazos: {
            where: { activo: true },
            include: {
              agenteSuplente: {
                select: { nombre: true, apellido: true },
              },
            },
            take: 1,
          },
        },
        take: 1,
      },
    },
  },
  hijos: true,
  asignacion: {
    include: {
      titularidades: {
        orderBy: { fecha_desde: "desc" as const },
        include: { agente: true },
        take: 1,
      },
      unidad:   true,
      materia:  true,
      comision: { include: { curso: true, turno: true } },
      turno:    true,
    },
  },
}

export const incidenciaRepository = {
  
listar(tenantId: number, asignacionId?: number, incluirEliminadas = false) {
  return prisma.incidencia.findMany({
    where: {
      asignacion: {
        institucionId: tenantId,
        ...(asignacionId ? { id: asignacionId } : {}),
      },
      ...(incluirEliminadas ? {} : { activo: true, deletedAt: null }),
    },
    include: incidenciaInclude,
    orderBy: { fecha_desde: "desc" },
  })
},

  obtenerPorId(id: number, tenantId: number) {
    return prisma.incidencia.findFirst({
      where: {
        id,
        asignacion: {
          institucionId: tenantId,
        },
      },
      include: incidenciaInclude,
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.incidencia.findFirst({
      where: {
        id,
        asignacion: {
          institucionId: tenantId,
        },
      },
      select: {
        id: true,
        deletedAt: true,
      },
    })
  },

  verificarAsignacion(asignacionId: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: {
        id: asignacionId,
        institucionId: tenantId,
        activo: true,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  verificarAsignacionBasica(asignacionId: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: {
        id: asignacionId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  verificarCodigarioItem(codigarioItemId: number, tenantId: number) {
    return prisma.codigarioItem.findFirst({
      where: {
        id: codigarioItemId,
        activo: true,
        codigario: {
          institucionId: tenantId,
        },
      },
      select: { id: true },
    })
  },

  verificarPadre(
    incidenciaPadreId: number,
    asignacionId: number,
    tenantId: number
  ) {
    return prisma.incidencia.findFirst({
      where: {
        id:          incidenciaPadreId,
        asignacionId,
        activo:      true,
        deletedAt:   null,
        asignacion: {
          institucionId: tenantId,
        },
      },
      select: { id: true, fecha_desde: true, fecha_hasta: true },  // ← agregar fecha_desde
    })
  },

  verificarSuperposicion(
    asignacionId: number,
    fechaDesde: Date,
    fechaHasta: Date,
    tenantId: number,
    excludeId?: number,
    excludeIds?: number[]
  ) {
    return prisma.incidencia.findFirst({
      where: {
        asignacionId,
        activo: true,
        deletedAt: null,
        asignacion: {
          institucionId: tenantId,
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        // Permitir superposición con toda la cadena de ancestros
        // (padre, abuelo, bisabuelo...), NO con hermanas ni incidencias
        // no relacionadas.
        ...(excludeIds && excludeIds.length > 0
          ? { id: { notIn: excludeIds } }
          : {}),
        AND: [
          { fecha_desde: { lte: fechaHasta } },
          { fecha_hasta: { gte: fechaDesde } },
        ],
      },
      select: {
        id: true,
        fecha_desde: true,
        fecha_hasta: true,
      },
    })
  },
  async obtenerAncestros(incidenciaId: number, tenantId: number): Promise<number[]> {
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      WITH RECURSIVE ancestros AS (
        SELECT i.id, i."incidenciaPadreId"
        FROM "Incidencia" i
        INNER JOIN "Asignacion" a ON a.id = i."asignacionId"
        WHERE i.id = ${incidenciaId}
          AND a."institucionId" = ${tenantId}
        UNION ALL
        SELECT i.id, i."incidenciaPadreId"
        FROM "Incidencia" i
        INNER JOIN "Asignacion" a ON a.id = i."asignacionId"
        INNER JOIN ancestros anc ON anc."incidenciaPadreId" = i.id
        WHERE a."institucionId" = ${tenantId}
      )
      SELECT id FROM ancestros
    `
    return rows.map(r => r.id)
  },

  crear(data: {
    asignacionId: number
    fecha_desde: Date
    fecha_hasta: Date
    codigarioItemId: number
    incidenciaPadreId?: number | null
    observacion?: string
  }) {
    return prisma.incidencia.create({
      data: {
        asignacionId: data.asignacionId,
        fecha_desde: data.fecha_desde,
        fecha_hasta: data.fecha_hasta,
        codigarioItemId: data.codigarioItemId,
        incidenciaPadreId: data.incidenciaPadreId ?? null,
        observacion: data.observacion,
      },
      include: incidenciaInclude,
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: {
      fecha_desde: Date
      fecha_hasta: Date
      codigarioItemId: number
      observacion?: string
    }
  ) {
    const existente = await prisma.incidencia.findFirst({
      where: {
        id,
        deletedAt: null,
        asignacion: {
          institucionId: tenantId,
        },
      },
      select: { id: true },
    })

    if (!existente) {
      return null
    }

    return prisma.incidencia.update({
      where: { id },
      data,
      include: incidenciaInclude,
    })
  },

  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.incidencia.findFirst({
      where: {
        id,
        deletedAt: null,
        asignacion: {
          institucionId: tenantId,
        },
      },
      select: { id: true },
    })

    if (!existente) {
      return null
    }

    return prisma.incidencia.update({
      where: { id },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })
  },

  cadena(incidenciaId: number, tenantId: number) {
    return prisma.$queryRaw`
      WITH RECURSIVE padres AS (
        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN "Asignacion" a ON a.id = i."asignacionId"
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE i.id = ${incidenciaId}
          AND a."institucionId" = ${tenantId}

        UNION ALL

        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN "Asignacion" a ON a.id = i."asignacionId"
        INNER JOIN padres p ON p."incidenciaPadreId" = i.id
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE a."institucionId" = ${tenantId}
      ),

      hijos AS (
        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN "Asignacion" a ON a.id = i."asignacionId"
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE i.id = ${incidenciaId}
          AND a."institucionId" = ${tenantId}

        UNION ALL

        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN "Asignacion" a ON a.id = i."asignacionId"
        INNER JOIN hijos h ON i."incidenciaPadreId" = h.id
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE a."institucionId" = ${tenantId}
      )

      SELECT DISTINCT *
      FROM (
        SELECT * FROM padres
        UNION
        SELECT * FROM hijos
      ) t
    `
  },

  existeEliminada(id: number, tenantId: number) {
    return prisma.incidencia.findFirst({
      where: {
        id,
        activo: false,
        asignacion: { institucionId: tenantId },
      },
      select: { id: true, asignacionId: true, fecha_desde: true, fecha_hasta: true },
    })
  },

  reactivar(id: number) {
    return prisma.incidencia.update({
      where: { id },
      data: {
        activo: true,
        deletedAt: null,
      },
    })
  },
}
