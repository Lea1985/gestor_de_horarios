import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarCodigarios } from "@/lib/usecases/codigarios/listarCodigarios"
import { crearCodigario, NombreObligatorioError } from "@/lib/usecases/codigarios/crearCodigario"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const codigarios = await listarCodigarios(tenantId)
    return Response.json(codigarios)
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const nuevo = await crearCodigario(tenantId, body)
      return Response.json(nuevo, { status: 201 })
    } catch (error) {
      if (error instanceof NombreObligatorioError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe un codigario con ese nombre" }, { status: 409 })
      }
      console.error("Error creando codigario:", error)
      return Response.json({ error: "Error creando codigario" }, { status: 500 })
    }
  })
}