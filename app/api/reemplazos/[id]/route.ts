//api/reemplazos/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerReemplazo, ReemplazoNoEncontradoError as ObtenerNotFound } from "@/lib/usecases/reemplazos/obtenerReemplazo"
import { eliminarReemplazo, ReemplazoNoEncontradoError as EliminarNotFound } from "@/lib/usecases/reemplazos/eliminarReemplazo"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reemplazoId = parseId(id)
  if (!reemplazoId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await obtenerReemplazo(reemplazoId, tenantId))
    } catch (error) {
      if (error instanceof ObtenerNotFound) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error obteniendo reemplazo" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reemplazoId = parseId(id)
  if (!reemplazoId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await eliminarReemplazo(reemplazoId, tenantId))
    } catch (error) {
      if (error instanceof EliminarNotFound) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error eliminando reemplazo" }, { status: 500 })
    }
  })
}