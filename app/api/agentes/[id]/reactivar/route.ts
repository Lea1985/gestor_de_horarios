// app/api/agentes/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import { reactivarAgente, AgenteNoEncontradoError } from "@/lib/usecases/agentes/reactivarAgente"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const agenteId = parseId(id)
  if (!agenteId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      const result = await reactivarAgente(agenteId, tenantId)
      return Response.json(result)
    } catch (error) {
      if (error instanceof AgenteNoEncontradoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      console.error("Error reactivando agente:", error)
      return Response.json({ error: "Error reactivando agente" }, { status: 500 })
    }
  })
}