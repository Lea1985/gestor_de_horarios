import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { obtenerModulo, ModuloNoEncontradoError as ObtenerNotFound } from "@/lib/usecases/modulos/obtenerModulo"
import { actualizarModulo, ModuloNoEncontradoError as ActualizarNotFound, HorasInvalidasError, SolapamientoError } from "@/lib/usecases/modulos/actualizarModulo"
import { eliminarModulo } from "@/lib/usecases/modulos/eliminarModulo"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const moduloId = parseId(id)
  if (!moduloId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await obtenerModulo(moduloId, tenantId))
    } catch (error) {
      if (error instanceof ObtenerNotFound) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error obteniendo módulo" }, { status: 500 })
    }
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const moduloId = parseId(id)
  if (!moduloId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarModulo(moduloId, tenantId, body))
    } catch (error) {
      if (error instanceof ActualizarNotFound) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof HorasInvalidasError) return Response.json({ error: error.message }, { status: 400 })
      if (error instanceof SolapamientoError) return Response.json({ error: error.message }, { status: 409 })
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe un módulo con esos datos" }, { status: 409 })
      }
      return Response.json({ error: "Error actualizando módulo" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const moduloId = parseId(id)
  if (!moduloId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    return Response.json(await eliminarModulo(moduloId, tenantId))
  })
}