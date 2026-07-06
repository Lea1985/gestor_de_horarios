// app/api/comisiones/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import { reactivarComision, ComisionNoEncontradaError } from "@/lib/usecases/comisiones/reactivarComision"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const comisionId = parseId(id)
  if (!comisionId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await reactivarComision(comisionId, tenantId))
    } catch (error) {
      if (error instanceof ComisionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: (error as Error).message ?? "Error reactivando comisión" }, { status: 409 })
    }
  })
}