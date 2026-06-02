import { withContext } from "@/lib/auth/withContext"
import { reactivarItem, ItemNoEncontradoError } from "@/lib/usecases/codigarios/reactivarItem"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await context.params
  const id = parseId(itemId)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      const item = await reactivarItem(id, tenantId)
      return Response.json(item)
    } catch (error) {
      if (error instanceof ItemNoEncontradoError)
        return Response.json({ error: error.message }, { status: 404 })
      return Response.json({ error: "Error reactivando item" }, { status: 500 })
    }
  })
}