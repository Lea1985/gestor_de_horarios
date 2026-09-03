// app/api/distribuciones/[id]/nueva-version/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  nuevaVersionDistribucion,
  DistribucionNoEncontradaError,
  VersionEnConflictoError,
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
    // Body opcional: sin body = primer intento (puede volver
    // requiereConfirmacion). Con { mantenerReemplazo } = confirmación.
    let body: { mantenerReemplazo?: boolean } = {}
    try {
      const text = await req.text()
      if (text) body = JSON.parse(text)
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const result = await nuevaVersionDistribucion(distId, tenantId, body)
      return Response.json(result)
    } catch (error) {
      if (error instanceof DistribucionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      // UX-DIS-009: doble click / dos pestañas creando versión al mismo
      // tiempo -- el @@unique de la DB ya lo protegía; esto solo evita
      // que el usuario vea un 500 crudo.
      if (error instanceof VersionEnConflictoError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      console.error("Error creando nueva versión:", error)
      return Response.json({ error: "Error creando nueva versión" }, { status: 500 })
    }
  })
}