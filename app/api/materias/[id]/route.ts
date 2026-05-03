// app/api/materias/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import {
  obtenerMateria,
  MateriaNoEncontradaError as ObtenerNotFound,
} from "@/lib/usecases/materias/obtenerMateria"

import {
  actualizarMateria,
  MateriaNoEncontradaError as ActualizarNotFound,
  SinCamposParaActualizarError,
} from "@/lib/usecases/materias/actualizarMateria"

import {
  eliminarMateria,
  MateriaNoEncontradaError as EliminarNotFound,
} from "@/lib/usecases/materias/eliminarMateria"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const materiaId = parseId(id)

  if (!materiaId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const materia = await obtenerMateria(
        materiaId,
        tenantId
      )

      return Response.json(materia)
    } catch (error) {
      if (error instanceof ObtenerNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error(error)

      return Response.json(
        { error: "Error obteniendo materia" },
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
  const materiaId = parseId(id)

  if (!materiaId) {
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
      const materia = await actualizarMateria(
        materiaId,
        tenantId,
        body
      )

      return Response.json(materia)
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
          { error: "Ya existe una materia con ese nombre" },
          { status: 409 }
        )
      }

      console.error(error)

      return Response.json(
        { error: "Error actualizando materia" },
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
  const materiaId = parseId(id)

  if (!materiaId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const result = await eliminarMateria(
        materiaId,
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

      console.error(error)

      return Response.json(
        { error: "Error eliminando materia" },
        { status: 500 }
      )
    }
  })
}