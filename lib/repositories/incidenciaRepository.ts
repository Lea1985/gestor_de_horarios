import prisma from "@/lib/prisma"

const incidenciaInclude = {
  codigarioItem: true,
  padre:         true,
  hijos:         true,
}

export const incidenciaRepository = {

  listar(tenantId: number, asignacionId?: number) {
    return prisma.incidencia.findMany({
      where: {
        activo:    true,
        deletedAt: null,
        asignacion: {
          institucionId: tenantId,
          ...(asignacionId ? { id: asignacionId } : {}),
        },
      },
      include: incidenciaInclude,
      orderBy: { fecha_desde: "desc" },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.incidencia.findFirst({
      where: { id, deletedAt: null, asignacion: { institucionId: tenantId } },
      include: incidenciaInclude,
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.incidencia.findFirst({
      where: { id, asignacion: { institucionId: tenantId } },
      select: { id: true, deletedAt: true },
    })
  },

  verificarAsignacion(asignacionId: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: { id: asignacionId, institucionId: tenantId, activo: true, deletedAt: null },
      select: { id: true },
    })
  },

  verificarAsignacionBasica(asignacionId: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: { id: asignacionId, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })
  },

  verificarCodigarioItem(codigarioItemId: number, tenantId: number) {
    return prisma.codigarioItem.findFirst({
      where: { id: codigarioItemId, activo: true, codigario: { institucionId: tenantId } },
      select: { id: true },
    })
  },

  verificarPadre(incidenciaPadreId: number, asignacionId: number) {
    return prisma.incidencia.findFirst({
      where: { id: incidenciaPadreId, asignacionId, deletedAt: null },
      select: { id: true },
    })
  },

  verificarSuperposicion(asignacionId: number, fechaDesde: Date, fechaHasta: Date, excludeId?: number) {
    return prisma.incidencia.findFirst({
      where: {
        asignacionId,
        activo:    true,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        AND: [
          { fecha_desde: { lte: fechaHasta } },
          { fecha_hasta: { gte: fechaDesde } },
        ],
      },
      select: { id: true, fecha_desde: true, fecha_hasta: true },
    })
  },

  crear(data: {
    asignacionId:      number
    fecha_desde:       Date
    fecha_hasta:       Date
    codigarioItemId:   number
    incidenciaPadreId?: number | null
    observacion?:      string
  }) {
    return prisma.incidencia.create({
      data: {
        asignacionId:      data.asignacionId,
        fecha_desde:       data.fecha_desde,
        fecha_hasta:       data.fecha_hasta,
        codigarioItemId:   data.codigarioItemId,
        incidenciaPadreId: data.incidenciaPadreId ?? null,
        observacion:       data.observacion,
      },
      include: { codigarioItem: true, padre: true },
    })
  },

  actualizar(id: number, data: {
    fecha_desde:     Date
    fecha_hasta:     Date
    codigarioItemId: number
    observacion?:    string
  }) {
    return prisma.incidencia.update({
      where: { id },
      data,
      include: incidenciaInclude,
    })
  },

  eliminar(id: number) {
    return prisma.incidencia.update({
      where: { id },
      data: { activo: false, deletedAt: new Date() },
    })
  },

  cadena(incidenciaId: number) {
    return prisma.$queryRaw`
      WITH RECURSIVE padres AS (
        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE i.id = ${incidenciaId}
        UNION ALL
        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN padres p ON p."incidenciaPadreId" = i.id
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
      ),
      hijos AS (
        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE i.id = ${incidenciaId}
        UNION ALL
        SELECT i.id, i."asignacionId", i."incidenciaPadreId", i."fecha_desde", i."fecha_hasta",
               ci.nombre AS tipo, i."codigarioItemId", i."observacion", i."activo",
               i."deletedAt", i."createdAt", i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN hijos h ON i."incidenciaPadreId" = h.id
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
      )
      SELECT DISTINCT * FROM (SELECT * FROM padres UNION SELECT * FROM hijos) t
    `
  },
}