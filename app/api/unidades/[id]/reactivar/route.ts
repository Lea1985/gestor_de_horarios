// app/api/unidades/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import { reactivarUnidad } from "@/lib/usecases/unidades/reactivarUnidad"
import { UnidadNoEncontradaError } from "@/lib/usecases/unidades/obtenerUnidad"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const unidadId = parseId(id)
  if (!unidadId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async (ctx) => {
    try {
      return Response.json(await reactivarUnidad(ctx, unidadId))
    } catch (error) {
      if (error instanceof UnidadNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: (error as Error).message ?? "Error reactivando unidad" }, { status: 409 })
    }
  })
}