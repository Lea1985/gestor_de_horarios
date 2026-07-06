// app/api/codigarios/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  reactivarCodigario,
  CodigarioNoEncontradoError,
} from "@/lib/usecases/codigarios/reactivarCodigario"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const codigarioId = parseId(id)

  if (!codigarioId) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await reactivarCodigario(codigarioId, tenantId))
    } catch (error) {
      if (error instanceof CodigarioNoEncontradoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: "Error reactivando codigario" }, { status: 500 })
    }
  })
}