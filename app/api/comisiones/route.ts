// app/api/comisiones/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import { listarComisiones } from "@/lib/usecases/comisiones/listarComisiones"
import {
  crearComision,
  DatosComisionInvalidosError,
} from "@/lib/usecases/comisiones/crearComision"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const comisiones = await listarComisiones(tenantId)
    return Response.json(comisiones)
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body

    try {
      body = await req.json()
    } catch {
      return Response.json(
        { error: "JSON inválido" },
        { status: 400 }
      )
    }

    try {
      const result = await crearComision(tenantId, body)

      return Response.json(result, {
        status: 201,
      })
    } catch (error) {
      if (error instanceof DatosComisionInvalidosError) {
        return Response.json(
          { error: error.message },
          { status: 400 }
        )
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe una comisión con ese nombre en el curso" },
          { status: 409 }
        )
      }

      console.error("Error creando comisión:", error)

      return Response.json(
        { error: "Error creando comisión" },
        { status: 500 }
      )
    }
  })
}