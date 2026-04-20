//api/incidencias/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerIncidencia, IncidenciaNoEncontradaError as ObtenerNotFound } from "@/lib/usecases/incidencias/obtenerIncidencia"
import { actualizarIncidencia, IncidenciaNoEncontradaError as ActualizarNotFound, RangoFechasInvalidoError, CodigarioItemNoValidoError, SuperposicionError } from "@/lib/usecases/incidencias/actualizarIncidencia"
import { eliminarIncidencia } from "@/lib/usecases/incidencias/eliminarIncidencia"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const incId = parseId(id)
  if (!incId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await obtenerIncidencia(incId, tenantId))
    } catch (error) {
      if (error instanceof ObtenerNotFound) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error obteniendo incidencia" }, { status: 500 })
    }
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const incId = parseId(id)
  if (!incId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarIncidencia(incId, tenantId, body))
    } catch (error) {
      if (error instanceof ActualizarNotFound) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof RangoFechasInvalidoError || error instanceof CodigarioItemNoValidoError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof SuperposicionError) {
        return Response.json({ error: error.message, conflicto: error.conflicto }, { status: 409 })
      }
      return Response.json({ error: "Error actualizando incidencia" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const incId = parseId(id)
  if (!incId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    return Response.json(await eliminarIncidencia(incId, tenantId))
  })
}