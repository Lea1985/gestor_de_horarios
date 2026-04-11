// app/api/incidencias/[id]/cadena/route.ts
// Devuelve la cadena completa de una incidencia: todos sus padres y todos
// sus hijos en forma recursiva, usando una CTE recursiva de PostgreSQL.

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const incidenciaId = Number(id)

  if (!incidenciaId || isNaN(incidenciaId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    // Verificar existencia y pertenencia al tenant
    const existe = await prisma.incidencia.findFirst({
      where: {
        id:        incidenciaId,
        deletedAt: null,
        asignacion: { institucionId: tenantId },
      },
      select: { id: true },
    })

    if (!existe) {
      return Response.json({ error: "Incidencia no encontrada" }, { status: 404 })
    }

    // CTE recursiva: sube hacia los padres y baja hacia los hijos
    const result = await prisma.$queryRaw`
      WITH RECURSIVE padres AS (
        SELECT
          i.id,
          i."asignacionId",
          i."incidenciaPadreId",
          i."fecha_desde",
          i."fecha_hasta",
          ci.nombre  AS tipo,
          i."codigarioItemId",
          i."observacion",
          i."activo",
          i."deletedAt",
          i."createdAt",
          i."updatedAt"
        FROM "Incidencia" i
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE i.id = ${incidenciaId}

        UNION ALL

        SELECT
          i.id,
          i."asignacionId",
          i."incidenciaPadreId",
          i."fecha_desde",
          i."fecha_hasta",
          ci.nombre  AS tipo,
          i."codigarioItemId",
          i."observacion",
          i."activo",
          i."deletedAt",
          i."createdAt",
          i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN padres p ON p."incidenciaPadreId" = i.id
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
      ),

      hijos AS (
        SELECT
          i.id,
          i."asignacionId",
          i."incidenciaPadreId",
          i."fecha_desde",
          i."fecha_hasta",
          ci.nombre  AS tipo,
          i."codigarioItemId",
          i."observacion",
          i."activo",
          i."deletedAt",
          i."createdAt",
          i."updatedAt"
        FROM "Incidencia" i
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
        WHERE i.id = ${incidenciaId}

        UNION ALL

        SELECT
          i.id,
          i."asignacionId",
          i."incidenciaPadreId",
          i."fecha_desde",
          i."fecha_hasta",
          ci.nombre  AS tipo,
          i."codigarioItemId",
          i."observacion",
          i."activo",
          i."deletedAt",
          i."createdAt",
          i."updatedAt"
        FROM "Incidencia" i
        INNER JOIN hijos h ON i."incidenciaPadreId" = h.id
        LEFT JOIN "CodigarioItem" ci ON ci.id = i."codigarioItemId"
      )

      SELECT DISTINCT * FROM (
        SELECT * FROM padres
        UNION
        SELECT * FROM hijos
      ) t
    `

    return Response.json(result)
  })
}