// app/api/agentes/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { obtenerAgente, AgenteNoEncontradoError as ObtenerNotFound } from "@/lib/usecases/agentes/obtenerAgente"
import { actualizarAgente, AgenteNoEncontradoError as ActualizarNotFound, SinCamposParaActualizarError } from "@/lib/usecases/agentes/actualizarAgente"
import { eliminarAgente, AgenteNoEncontradoError as EliminarNotFound, TieneAsignacionesActivasError } from "@/lib/usecases/agentes/eliminarAgente"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const agenteId = parseId(id)
  if (!agenteId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await obtenerAgente(agenteId, tenantId))
    } catch (error) {
      if (error instanceof ObtenerNotFound) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: "Error obteniendo agente" }, { status: 500 })
    }
  })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const agenteId = parseId(id)
  if (!agenteId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      return Response.json(await actualizarAgente(agenteId, tenantId, body))
    } catch (error) {
      if (error instanceof ActualizarNotFound) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof SinCamposParaActualizarError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json({ error: "El documento ya está en uso en esta institución" }, { status: 409 })
      }
      return Response.json({ error: "Error actualizando agente" }, { status: 500 })
    }
  })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const agenteId = parseId(id)
  if (!agenteId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await eliminarAgente(agenteId, tenantId))
    } catch (error) {
      if (error instanceof EliminarNotFound) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof TieneAsignacionesActivasError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      return Response.json({ error: "Error eliminando agente" }, { status: 500 })
    }
  })
}