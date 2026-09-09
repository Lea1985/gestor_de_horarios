import { withContext } from "@/lib/auth/withContext"
import {
  listarAsignaciones,
  listarAsignacionesParaIncidencia,
} from "@/lib/usecases/asignaciones/listarAsignaciones"
import {
  crearAsignacion,
  DatosAsignacionInvalidosError,
  EntidadNoEncontradaError,
  IdentificadorDuplicadoError,
} from "@/lib/usecases/asignaciones/crearAsignacion"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)
    const incluirInactivas = searchParams.get("inactivas") === "true"
    const paraIncidencia = searchParams.get("paraIncidencia") === "true"
    const data = paraIncidencia
      ? await listarAsignacionesParaIncidencia(tenantId)
      : await listarAsignaciones(tenantId, incluirInactivas)
    return Response.json(data)
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const created = await crearAsignacion(tenantId, body)
      return Response.json(created, { status: 201 })
    } catch (error) {
      if (error instanceof IdentificadorDuplicadoError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      if (error instanceof DatosAsignacionInvalidosError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof EntidadNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: "Error creando asignación" }, { status: 500 })
    }
  })
}