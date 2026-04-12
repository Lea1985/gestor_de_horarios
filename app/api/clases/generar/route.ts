import { withContext } from "@/lib/auth/withContext"
import { generarClases, DatosGenerarInvalidosError, FechasInvalidasError, RangoInvalidoError, DistribucionNoEncontradaError } from "@/lib/usecases/clases/generarClases"

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const result = await generarClases(tenantId, body)
      return Response.json(result)
    } catch (error) {
      if (error instanceof DatosGenerarInvalidosError || error instanceof FechasInvalidasError || error instanceof RangoInvalidoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof DistribucionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof Error && error.message.includes("vigencia")) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      console.error("Error generando clases:", error)
      return Response.json({ error: "Error generando clases" }, { status: 500 })
    }
  })
}