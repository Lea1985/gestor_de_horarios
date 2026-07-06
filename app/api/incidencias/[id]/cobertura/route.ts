import { withContext } from "@/lib/auth/withContext"
import { obtenerCoberturaPorTramos } from "@/lib/usecases/incidencias/obtenerCoberturaPorTramos"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const incId = parseId(id)
  if (!incId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    return Response.json(await obtenerCoberturaPorTramos(incId, tenantId))
  })
}