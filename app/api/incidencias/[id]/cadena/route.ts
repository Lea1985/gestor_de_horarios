//api/incidencias/[id]/cadena/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerCadena, IncidenciaNoEncontradaError } from "@/lib/usecases/incidencias/obtenerCadena"

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
      return Response.json(await obtenerCadena(incId, tenantId))
    } catch (error) {
      if (error instanceof IncidenciaNoEncontradaError) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error obteniendo cadena" }, { status: 500 })
    }
  })
}