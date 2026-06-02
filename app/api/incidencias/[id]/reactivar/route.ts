//app/api/incidencias/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  reactivarIncidencia,
  IncidenciaNoEncontradaError,
  SuperposicionError,
  FechaPasadaError,
} from "@/lib/usecases/incidencias/reactivarIncidencia"

function parseId(id: string) {
  const n = Number(id)
  return Number.isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      const result = await reactivarIncidencia(id, tenantId)
      return Response.json(result)
    } catch (error) {
      if (error instanceof IncidenciaNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof FechaPasadaError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof SuperposicionError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      console.error("Error reactivando incidencia:", error)
      return Response.json({ error: "Error reactivando incidencia" }, { status: 500 })
    }
  })
}