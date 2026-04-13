import { withContext } from "@/lib/auth/withContext"
import { listarIncidencias } from "@/lib/usecases/incidencias/listarIncidencias"
import { crearIncidencia, DatosIncidenciaInvalidosError, RangoFechasInvalidoError, AsignacionNoValidaError, CodigarioItemNoValidoError, IncidenciaPadreNoValidaError, SuperposicionError } from "@/lib/usecases/incidencias/crearIncidencia"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)
    const asignacionId = searchParams.get("asignacionId")
    return Response.json(await listarIncidencias(tenantId, asignacionId ? Number(asignacionId) : undefined))
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const nueva = await crearIncidencia(tenantId, body)
      return Response.json(nueva, { status: 201 })
    } catch (error) {
      if (error instanceof DatosIncidenciaInvalidosError || error instanceof RangoFechasInvalidoError || error instanceof CodigarioItemNoValidoError || error instanceof IncidenciaPadreNoValidaError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof AsignacionNoValidaError) {
        return Response.json({ error: (error as Error).message }, { status: 404 })
      }
      if (error instanceof SuperposicionError) {
        return Response.json({ error: error.message, conflicto: error.conflicto }, { status: 409 })
      }
      console.error("Error creando incidencia:", error)
      return Response.json({ error: "Error creando incidencia" }, { status: 500 })
    }
  })
}