
// app/api/asignaciones/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { obtenerAsignacion, AsignacionNoEncontradaError as ObtenerNotFound } from "@/lib/usecases/asignaciones/obtenerAsignacion"
import { actualizarAsignacion, AsignacionNoEncontradaError as ActualizarNotFound, SinCamposParaActualizarError } from "@/lib/usecases/asignaciones/actualizarAsignacion"
import { eliminarAsignacion } from "@/lib/usecases/asignaciones/eliminarAsignacion"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const asignacionId = parseId(id)
  if (!asignacionId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      const asignacion = await obtenerAsignacion(asignacionId, tenantId)
      return Response.json(asignacion)
    } catch (error) {
      if (error instanceof ObtenerNotFound) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      console.error("Error obteniendo asignación:", error)
      return Response.json({ error: "Error obteniendo asignación" }, { status: 500 })
    }
  })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const asignacionId = parseId(id)
  if (!asignacionId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const actualizada = await actualizarAsignacion(asignacionId, tenantId, body)
      return Response.json(actualizada)
    } catch (error) {
      if (error instanceof ActualizarNotFound) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof SinCamposParaActualizarError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "El identificador estructural ya existe en esta institución" }, { status: 409 })
      }
      console.error("Error actualizando asignación:", error)
      return Response.json({ error: "Error actualizando asignación" }, { status: 500 })
    }
  })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const asignacionId = parseId(id)
  if (!asignacionId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const result = await eliminarAsignacion(asignacionId, tenantId)
    return Response.json(result)
  })
}