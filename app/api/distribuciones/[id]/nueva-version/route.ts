// app/api/distribuciones/[id]/nueva-version/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  nuevaVersionDistribucion,
  DistribucionNoEncontradaError,
  SinPeriodoOperativoError,
} from "@/lib/usecases/distribuciones/nuevaVersionDistribucion"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const distId = parseId(id)
  if (!distId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await nuevaVersionDistribucion(distId, tenantId))
    } catch (error) {
      if (error instanceof DistribucionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof SinPeriodoOperativoError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      console.error("Error creando nueva versión:", error)
      return Response.json({ error: "Error creando nueva versión" }, { status: 500 })
    }
  })
}