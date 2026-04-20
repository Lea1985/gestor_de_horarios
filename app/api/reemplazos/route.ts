import { withContext } from "@/lib/auth/withContext"
import { listarReemplazos, FiltroObligatorioError } from "@/lib/usecases/reemplazos/listarReemplazos"
import { crearReemplazo, DatosReemplazoInvalidosError, MismaAsignacionError, ClaseNoEncontradaError, AsignacionTitularNoEncontradaError, AsignacionSuplenteNoEncontradaError, ReemplazoActivoExistenteError } from "@/lib/usecases/reemplazos/crearReemplazo"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)
    try {
      return Response.json(await listarReemplazos(tenantId, {
        claseId:              searchParams.get("claseId"),
        asignacionTitularId:  searchParams.get("asignacionTitularId"),
        asignacionSuplenteId: searchParams.get("asignacionSuplenteId"),
        fecha_desde:          searchParams.get("fecha_desde"),
        fecha_hasta:          searchParams.get("fecha_hasta"),
      }))
    } catch (error) {
      if (error instanceof FiltroObligatorioError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      return Response.json({ error: "Error listando reemplazos" }, { status: 500 })
    }
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const reemplazo = await crearReemplazo(tenantId, body)
      return Response.json(reemplazo, { status: 201 })
    } catch (error) {
      if (error instanceof DatosReemplazoInvalidosError || error instanceof MismaAsignacionError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof ClaseNoEncontradaError || error instanceof AsignacionTitularNoEncontradaError || error instanceof AsignacionSuplenteNoEncontradaError) {
        return Response.json({ error: (error as Error).message }, { status: 404 })
      }
      if (error instanceof ReemplazoActivoExistenteError) {
        return Response.json({ error: (error as Error).message }, { status: 409 })
      }
      console.error("Error creando reemplazo:", error)
      return Response.json({ error: "Error creando reemplazo" }, { status: 500 })
    }
  })
}