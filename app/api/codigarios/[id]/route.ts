import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { obtenerCodigario, CodigarioNoEncontradoError as ObtenerNotFound } from "@/lib/usecases/codigarios/obtenerCodigario"
import { actualizarCodigario, CodigarioNoEncontradoError as ActualizarNotFound, SinCamposError } from "@/lib/usecases/codigarios/actualizarCodigario"
import { eliminarCodigario, CodigarioNoEncontradoError as EliminarNotFound } from "@/lib/usecases/codigarios/eliminarCodigario"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const codigarioId = parseId(id)
  if (!codigarioId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await obtenerCodigario(codigarioId, tenantId))
    } catch (error) {
      if (error instanceof ObtenerNotFound) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error obteniendo codigario" }, { status: 500 })
    }
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const codigarioId = parseId(id)
  if (!codigarioId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarCodigario(codigarioId, tenantId, body))
    } catch (error) {
      if (error instanceof ActualizarNotFound) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof SinCamposError) return Response.json({ error: error.message }, { status: 400 })
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe un codigario con ese nombre" }, { status: 409 })
      }
      return Response.json({ error: "Error actualizando codigario" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const codigarioId = parseId(id)
  if (!codigarioId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await eliminarCodigario(codigarioId, tenantId))
    } catch (error) {
      if (error instanceof EliminarNotFound) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error eliminando codigario" }, { status: 500 })
    }
  })
}