//app/api/unidades/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerUnidad, UnidadNoEncontradaError } from "@/lib/usecases/unidades/obtenerUnidad"
import { actualizarUnidad, SinCamposParaActualizarError } from "@/lib/usecases/unidades/actualizarUnidad"
import { eliminarUnidad } from "@/lib/usecases/unidades/eliminarUnidad"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const unidadId = parseId(id)
  if (!unidadId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async (ctx) => {
    try {
      return Response.json(await obtenerUnidad(ctx, unidadId))
    } catch (error) {
      if (error instanceof UnidadNoEncontradaError) return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error obteniendo unidad" }, { status: 500 })
    }
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const unidadId = parseId(id)
  if (!unidadId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async (ctx) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarUnidad(ctx, unidadId, body))
    } catch (error) {
      if (error instanceof UnidadNoEncontradaError) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof SinCamposParaActualizarError) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ error: "Error actualizando unidad" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const unidadId = parseId(id)
  if (!unidadId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async (ctx) => {
    return Response.json(await eliminarUnidad(ctx, unidadId))
  })
}
