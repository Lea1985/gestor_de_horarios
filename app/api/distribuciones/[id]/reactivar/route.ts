import { withContext } from "@/lib/auth/withContext"
import {
  reactivarDistribucion,
  DistribucionNoEncontradaError,
  YaExisteActivaError,
} from "@/lib/usecases/distribuciones/reactivarDistribucion"
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
      const result = await reactivarDistribucion(id, tenantId)
      return Response.json(result)
    } catch (error) {
      if (error instanceof DistribucionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof YaExisteActivaError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      console.error("Error reactivando distribución:", error)
      return Response.json({ error: "Error reactivando distribución" }, { status: 500 })
    }
  })
}