// app/api/turnos/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import { listarTurnos } from "@/lib/usecases/turnos/listarTurnos"
import { crearTurno } from "@/lib/usecases/turnos/crearTurno"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const turnos = await listarTurnos(tenantId)
      return Response.json(turnos)
    } catch (error) {
      console.error("Error listando turnos:", error)
      return Response.json(
        { error: "Error listando turnos" },
        { status: 500 }
      )
    }
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
      const turno = await crearTurno(tenantId, body)

      return Response.json(turno, {
        status: 201,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "El nombre es obligatorio" ||
          error.message ===
            "La hora de inicio debe ser menor a la hora fin"
        ) {
          return Response.json(
            { error: error.message },
            { status: 400 }
          )
        }
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe un turno con ese nombre" },
          { status: 409 }
        )
      }

      console.error("Error creando turno:", error)

      return Response.json(
        { error: "Error creando turno" },
        { status: 500 }
      )
    }
  })
}