// app/api/incidencias/asignacion/[id]/route.ts
// Devuelve todas las incidencias activas de una asignación específica.
// Valida que la asignación pertenece al tenant antes de devolver datos.

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const asignacionId = Number(id)

  if (!asignacionId || isNaN(asignacionId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    // Verificar que la asignación pertenece al tenant
    const asignacion = await prisma.asignacion.findFirst({
      where: {
        id:            asignacionId,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!asignacion) {
      return Response.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    const incidencias = await prisma.incidencia.findMany({
      where: {
        asignacionId,
        activo:    true,
        deletedAt: null,
      },
      include: {
        codigarioItem: true,
        padre:         true,
        hijos:         true,
      },
      orderBy: { fecha_desde: "desc" },
    })

    return Response.json(incidencias)
  })
}