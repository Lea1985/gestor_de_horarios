// app/api/periodos-operativos/[id]/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import {
  obtenerPeriodo,
  PeriodoNoEncontradoError as ObtenerNotFound,
} from "@/lib/usecases/periodosOperativos/obtenerPeriodo"

import {
  actualizarPeriodo,
  PeriodoNoEncontradoError as ActualizarNotFound,
  FechasInvalidasError,
} from "@/lib/usecases/periodosOperativos/actualizarPeriodo"

import {
  eliminarPeriodo,
  PeriodoNoEncontradoError as EliminarNotFound,
  NoSePuedeEliminarPeriodoVigenteError,
} from "@/lib/usecases/periodosOperativos/eliminarPeriodo"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {

  const { id } = await context.params

  const periodoId = parseId(id)

  if (!periodoId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {

    try {

      const periodo = await obtenerPeriodo(
        periodoId,
        tenantId
      )

      return Response.json(periodo)

    } catch (error) {

      if (error instanceof ObtenerNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error("Error obteniendo período:", error)

      return Response.json(
        { error: "Error obteniendo período" },
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

  const periodoId = parseId(id)

  if (!periodoId) {
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

      const periodo = await actualizarPeriodo(
        periodoId,
        tenantId,
        body
      )

      return Response.json(periodo)

    } catch (error) {

      if (error instanceof ActualizarNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      if (error instanceof FechasInvalidasError) {
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
          { error: "Ya existe un período con ese nombre en esta institución" },
          { status: 409 }
        )
      }

      console.error("Error actualizando período:", error)

      return Response.json(
        { error: "Error actualizando período" },
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

  const periodoId = parseId(id)

  if (!periodoId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {

    try {

      const result = await eliminarPeriodo(
        periodoId,
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

      if (error instanceof NoSePuedeEliminarPeriodoVigenteError) {
        return Response.json(
          { error: error.message },
          { status: 409 }
        )
      }

      console.error("Error eliminando período:", error)

      return Response.json(
        { error: "Error eliminando período" },
        { status: 500 }
      )
    }
  })
}