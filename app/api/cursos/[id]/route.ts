// app/api/cursos/[id]/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import {
  obtenerCurso,
  CursoNoEncontradoError as ObtenerNotFound,
} from "@/lib/usecases/cursos/obtenerCurso"

import {
  actualizarCurso,
  CursoNoEncontradoError as ActualizarNotFound,
  SinCamposParaActualizarError,
} from "@/lib/usecases/cursos/actualizarCurso"

import {
  eliminarCurso,
  CursoNoEncontradoError as EliminarNotFound,
} from "@/lib/usecases/cursos/eliminarCurso"

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
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const curso = await obtenerCurso(cursoId, tenantId)
      return Response.json(curso)
    } catch (error) {
      if (error instanceof ObtenerNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error("Error obteniendo curso:", error)

      return Response.json(
        { error: "Error obteniendo curso" },
        { status: 500 }
      )
    }
  })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const cursoId = parseId(id)

  if (!cursoId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

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
      const curso = await actualizarCurso(
        cursoId,
        tenantId,
        body
      )

      return Response.json(curso)
    } catch (error) {
      if (error instanceof ActualizarNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      if (error instanceof SinCamposParaActualizarError) {
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

      console.error("Error actualizando curso:", error)

      return Response.json(
        { error: "Error actualizando curso" },
        { status: 500 }
      )
    }
  })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const cursoId = parseId(id)

  if (!cursoId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const result = await eliminarCurso(
        cursoId,
        tenantId
      )

      return Response.json(result)
    } catch (error) {
      if (error instanceof EliminarNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error("Error eliminando curso:", error)

      return Response.json(
        { error: "Error eliminando curso" },
        { status: 500 }
      )
    }
  })
}