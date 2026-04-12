import { withContext } from "@/lib/auth/withContext"
import { obtenerClase, ClaseNoEncontradaError as ObtenerNotFound } from "@/lib/usecases/clases/obtenerClase"
import { actualizarClase, ClaseNoEncontradaError as ActualizarNotFound, SinCamposError, EstadoInvalidoError, IncidenciaInvalidaError } from "@/lib/usecases/clases/actualizarClase"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const claseId = parseId(id)
  if (!claseId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      const clase = await obtenerClase(claseId, tenantId)
      return Response.json(clase)
    } catch (error) {
      if (error instanceof ObtenerNotFound) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      console.error("Error obteniendo clase:", error)
      return Response.json({ error: "Error obteniendo clase" }, { status: 500 })
    }
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const claseId = parseId(id)
  if (!claseId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const clase = await actualizarClase(claseId, tenantId, body)
      return Response.json(clase)
    } catch (error) {
      if (error instanceof ActualizarNotFound) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof SinCamposError || error instanceof EstadoInvalidoError || error instanceof IncidenciaInvalidaError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      console.error("Error actualizando clase:", error)
      return Response.json({ error: "Error actualizando clase" }, { status: 500 })
    }
  })
}