import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

export async function GET(req: Request, context: any) {
  return withTenant(async (tenantId) => {

    const params = await context.params
    const id = Number(params.id)

    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    // 🔍 Validar pertenencia al tenant
    const existe = await prisma.incidencia.findFirst({
      where: {
        id,
        deletedAt: null,
        asignacion: {
          institucionId: tenantId
        }
      }
    })

    if (!existe) {
      return new Response(
        JSON.stringify({ error: "Incidencia no encontrada" }),
        { status: 404 }
      )
    }

    // 🔥 RECURSIVE SIN SELECT *
const result = await prisma.$queryRaw`
WITH RECURSIVE padres AS (
  SELECT 
    i.id,
    i."asignacionId",
    i."incidenciaPadreId",
    i."fecha_desde",
    i."fecha_hasta",
    ci.nombre as tipo,
    i."codigarioItemId",
    i."observacion",
    i."activo",
    i."deletedAt",
    i."createdAt",
    i."updatedAt"
  FROM "Incidencia" i
  LEFT JOIN "CodigarioItem" ci 
    ON ci.id = i."codigarioItemId"
  WHERE i.id = ${id}

  UNION ALL

  SELECT 
    i.id,
    i."asignacionId",
    i."incidenciaPadreId",
    i."fecha_desde",
    i."fecha_hasta",
    ci.nombre as tipo,
    i."codigarioItemId",
    i."observacion",
    i."activo",
    i."deletedAt",
    i."createdAt",
    i."updatedAt"
  FROM "Incidencia" i
  INNER JOIN padres p
    ON p."incidenciaPadreId" = i.id
  LEFT JOIN "CodigarioItem" ci 
    ON ci.id = i."codigarioItemId"
),

hijos AS (
  SELECT 
    i.id,
    i."asignacionId",
    i."incidenciaPadreId",
    i."fecha_desde",
    i."fecha_hasta",
    ci.nombre as tipo,
    i."codigarioItemId",
    i."observacion",
    i."activo",
    i."deletedAt",
    i."createdAt",
    i."updatedAt"
  FROM "Incidencia" i
  LEFT JOIN "CodigarioItem" ci 
    ON ci.id = i."codigarioItemId"
  WHERE i.id = ${id}

  UNION ALL

  SELECT 
    i.id,
    i."asignacionId",
    i."incidenciaPadreId",
    i."fecha_desde",
    i."fecha_hasta",
    ci.nombre as tipo,
    i."codigarioItemId",
    i."observacion",
    i."activo",
    i."deletedAt",
    i."createdAt",
    i."updatedAt"
  FROM "Incidencia" i
  INNER JOIN hijos h
    ON i."incidenciaPadreId" = h.id
  LEFT JOIN "CodigarioItem" ci 
    ON ci.id = i."codigarioItemId"
)

SELECT DISTINCT * FROM (
  SELECT * FROM padres
  UNION
  SELECT * FROM hijos
) t
`

    return Response.json(result)

  }, req)
}