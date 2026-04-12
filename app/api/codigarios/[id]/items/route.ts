import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"
import { crearItem, DatosItemInvalidosError, CodigarioNoEncontradoError } from "@/lib/usecases/codigarios/crearItem"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const codigarioId = parseId(id)
  if (!codigarioId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const items = await codigarioRepository.listarItems(codigarioId, tenantId)
    return Response.json(items)
  })
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const codigarioId = parseId(id)
  if (!codigarioId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const nuevo = await crearItem(codigarioId, tenantId, body)
      return Response.json(nuevo, { status: 201 })
    } catch (error) {
      if (error instanceof DatosItemInvalidosError) return Response.json({ error: error.message }, { status: 400 })
      if (error instanceof CodigarioNoEncontradoError) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe un item con ese código en este codigario" }, { status: 409 })
      }
      return Response.json({ error: "Error creando item" }, { status: 500 })
    }
  })
}