// app/api/agentes/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarAgentes } from "@/lib/usecases/agentes/listarAgentes"
import { crearAgente, DatosAgenteInvalidosError } from "@/lib/usecases/agentes/crearAgente"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const agentes = await listarAgentes(tenantId)
    return Response.json(agentes)
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
      const result = await crearAgente(tenantId, body)
      return Response.json(result, { status: 201 })
    } catch (error) {
      if (error instanceof DatosAgenteInvalidosError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "El documento ya está registrado en esta institución" },
          { status: 409 }
        )
      }
      console.error("Error creando agente:", error)
      return Response.json({ error: "Error creando agente" }, { status: 500 })
    }
  })
}