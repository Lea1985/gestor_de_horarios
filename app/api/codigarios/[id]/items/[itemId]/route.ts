import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"
import { actualizarItem, ItemNoEncontradoError, SinCamposError } from "@/lib/usecases/codigarios/actualizarItem"
import { eliminarItem } from "@/lib/usecases/codigarios/eliminarItem"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await context.params
  const id = parseId(itemId)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const item = await codigarioRepository.obtenerItem(id, tenantId)
    if (!item) return Response.json({ error: "Item no encontrado" }, { status: 404 })
    return Response.json(item)
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await context.params
  const id = parseId(itemId)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarItem(id, tenantId, body))
    } catch (error) {
      if (error instanceof ItemNoEncontradoError) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof SinCamposError) return Response.json({ error: error.message }, { status: 400 })
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe un item con ese código en este codigario" }, { status: 409 })
      }
      return Response.json({ error: "Error actualizando item" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await context.params
  const id = parseId(itemId)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const result = await eliminarItem(id, tenantId)
    return Response.json(result)
  })
}