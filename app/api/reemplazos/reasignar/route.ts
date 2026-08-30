// app/api/reemplazos/reasignar/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  reasignarReemplazoAIncidencia,
  ClaseNoEncontradaError,
  IncidenciaNoValidaError,
} from "@/lib/usecases/reemplazos/reasignarReemplazoAIncidencia"
import {
  AutoReemplazoError,
  SuperposicionSuplenteError,
} from "@/lib/usecases/reemplazos/crearReemplazo"

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const reemplazo = await reasignarReemplazoAIncidencia(tenantId, body)
      return Response.json(reemplazo, { status: 201 })
    } catch (error) {
      if (error instanceof ClaseNoEncontradaError || error instanceof IncidenciaNoValidaError) {
        return Response.json({ error: (error as Error).message }, { status: 404 })
      }
      if (error instanceof AutoReemplazoError || error instanceof SuperposicionSuplenteError) {
        return Response.json({ error: (error as Error).message }, { status: 409 })
      }
      console.error("Error reasignando reemplazo:", error)
      return Response.json({ error: "Error reasignando reemplazo" }, { status: 500 })
    }
  })
}