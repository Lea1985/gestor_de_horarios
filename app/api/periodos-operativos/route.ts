// app/api/periodos-operativos/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarPeriodos } from "@/lib/usecases/periodosOperativos/listarPeriodos"
import { crearPeriodo, DatosPeriodoInvalidosError, FechasInvalidasError } from "@/lib/usecases/periodosOperativos/crearPeriodo"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)
    const incluirInactivos = searchParams.get("inactivos") === "true"
    const periodos = await listarPeriodos(tenantId, incluirInactivos)
    return Response.json(periodos)
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
      const result = await crearPeriodo(tenantId, body)
      return Response.json(result, { status: 201 })
    } catch (error) {
      if (error instanceof DatosPeriodoInvalidosError || error instanceof FechasInvalidasError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe un período con ese nombre en esta institución" },
          { status: 409 }
        )
      }
      console.error("Error creando período:", error)
      return Response.json({ error: "Error creando período" }, { status: 500 })
    }
  })
}