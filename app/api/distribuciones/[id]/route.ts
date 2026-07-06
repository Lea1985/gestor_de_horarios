// app/api/distribuciones/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { obtenerDistribucion, DistribucionNoEncontradaError as ObtenerNotFound } from "@/lib/usecases/distribuciones/obtenerDistribucion"
import { actualizarDistribucion, DistribucionNoEncontradaError as ActualizarNotFound, SinCamposError } from "@/lib/usecases/distribuciones/actualizarDistribucion"
import { eliminarDistribucion } from "@/lib/usecases/distribuciones/eliminarDistribucion"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const distId = parseId(id)
  if (!distId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await obtenerDistribucion(distId, tenantId))
    } catch (error) {
      if (error instanceof ObtenerNotFound) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error obteniendo distribución" }, { status: 500 })
    }
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const distId = parseId(id)
  if (!distId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarDistribucion(distId, tenantId, body))
    } catch (error) {
      if (error instanceof ActualizarNotFound) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof SinCamposError) return Response.json({ error: error.message }, { status: 400 })
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Conflicto de versión en esta asignación" }, { status: 409 })
      }
      return Response.json({ error: "Error actualizando distribución" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const distId = parseId(id)
  if (!distId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    // El body es opcional: DELETE sin body = primera llamada (puede volver
    // requiereConfirmacion). DELETE con { mantenerReemplazo } = confirmación.
    let body: { mantenerReemplazo?: boolean } = {}
    try {
      const text = await req.text()
      if (text) body = JSON.parse(text)
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const result = await eliminarDistribucion(distId, tenantId, body)

    // IMPORTANTE: si requiereConfirmacion, NO es un borrado exitoso.
    // Devolvemos 200 igual (es una pregunta, no un error) pero el frontend
    // DEBE chequear el flag antes de asumir que se borró algo.
    return Response.json(result)
  })
}
