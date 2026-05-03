// app/api/cursos/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import { listarCursos } from "@/lib/usecases/cursos/listarCursos"
import {
  crearCurso,
  DatosCursoInvalidosError,
} from "@/lib/usecases/cursos/crearCurso"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const cursos = await listarCursos(tenantId)
    return Response.json(cursos)
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
      const curso = await crearCurso(tenantId, body)

      return Response.json(curso, {
        status: 201,
      })
    } catch (error) {
      if (error instanceof DatosCursoInvalidosError) {
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
          { error: "Ya existe un curso con ese nombre" },
          { status: 409 }
        )
      }

      console.error("Error creando curso:", error)

      return Response.json(
        { error: "Error creando curso" },
        { status: 500 }
      )
    }
  })
}