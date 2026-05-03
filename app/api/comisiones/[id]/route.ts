// app/api/comisiones/[id]/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import {
  obtenerComision,
  ComisionNoEncontradaError as ObtenerNotFound,
} from "@/lib/usecases/comisiones/obtenerComision"

import {
  actualizarComision,
  ComisionNoEncontradaError as ActualizarNotFound,
  SinCamposParaActualizarError,
} from "@/lib/usecases/comisiones/actualizarComision"

import {
  eliminarComision,
  ComisionNoEncontradaError as EliminarNotFound,
} from "@/lib/usecases/comisiones/eliminarComision"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const comisionId = parseId(id)

  if (!comisionId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const comision = await obtenerComision(
        comisionId,
        tenantId
      )

      return Response.json(comision)
    } catch (error) {
      if (error instanceof ObtenerNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error("Error obteniendo comisión:", error)

      return Response.json(
        { error: "Error obteniendo comisión" },
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
  const comisionId = parseId(id)

  if (!comisionId) {
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
      const result = await actualizarComision(
        comisionId,
        tenantId,
        body
      )

      return Response.json(result)
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
          { error: "Ya existe una comisión con ese nombre en el curso" },
          { status: 409 }
        )
      }

      console.error("Error actualizando comisión:", error)

      return Response.json(
        { error: "Error actualizando comisión" },
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
  const comisionId = parseId(id)

  if (!comisionId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const result = await eliminarComision(
        comisionId,
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

      console.error("Error eliminando comisión:", error)

      return Response.json(
        { error: "Error eliminando comisión" },
        { status: 500 }
      )
    }
  })
}