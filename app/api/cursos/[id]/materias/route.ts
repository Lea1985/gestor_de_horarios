//app/api/cursos/[id]/materias/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import { listarMaterias } from "@/lib/usecases/materias/listarMaterias"
import {
  crearMateria,
  DatosMateriaInvalidosError,
} from "@/lib/usecases/materias/crearMateria"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const cursoId = parseId(id)

  if (!cursoId) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    const materias = await listarMaterias(tenantId, cursoId)
    return Response.json(materias)
  })
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const cursoId = parseId(id)

  if (!cursoId) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    let body

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const materia = await crearMateria(tenantId, {
        ...body,
        cursoId,
      })

      return Response.json(materia, { status: 201 })
    } catch (error) {
      if (error instanceof DatosMateriaInvalidosError) {
        return Response.json({ error: error.message }, { status: 400 })
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe una materia con ese nombre en este curso" },
          { status: 409 }
        )
      }

      console.error(error)

      return Response.json({ error: "Error creando materia" }, { status: 500 })
    }
  })
}