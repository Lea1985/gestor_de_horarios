
// app/api/calendario-escolar/[id]/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import {
  obtenerCalendarioEscolar,
  CalendarioEscolarNoEncontradoError as ObtenerNotFound,
} from "@/lib/usecases/calendarioEscolar/obtenerCalendarioEscolar"

import {
  actualizarCalendarioEscolar,
  CalendarioEscolarNoEncontradoError as ActualizarNotFound,
  SinCamposParaActualizarError,
} from "@/lib/usecases/calendarioEscolar/actualizarCalendarioEscolar"

import {
  eliminarCalendarioEscolar,
  CalendarioEscolarNoEncontradoError as EliminarNotFound,
} from "@/lib/usecases/calendarioEscolar/eliminarCalendarioEscolar"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {

  const { id } = await context.params

  const calendarioId = parseId(id)

  if (!calendarioId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {

    try {

      const calendario =
        await obtenerCalendarioEscolar(
          calendarioId,
          tenantId
        )

      return Response.json(calendario)

    }
    catch (error) {

      if (error instanceof ObtenerNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error(
        "Error obteniendo evento de calendario escolar:",
        error
      )

      return Response.json(
        { error: "Error obteniendo evento de calendario escolar" },
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

  const calendarioId = parseId(id)

  if (!calendarioId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {

    let body

    try {
      body = await req.json()
    }
    catch {
      return Response.json(
        { error: "JSON inválido" },
        { status: 400 }
      )
    }

    try {

      const calendario =
        await actualizarCalendarioEscolar(
          calendarioId,
          tenantId,
          body
        )

      return Response.json(calendario)

    }
    catch (error) {

      if (error instanceof ActualizarNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      if (
        error instanceof SinCamposParaActualizarError
      ) {
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
          {
            error:
              "Ya existe un evento para esa fecha en esta institución",
          },
          { status: 409 }
        )
      }

      console.error(
        "Error actualizando evento de calendario escolar:",
        error
      )

      return Response.json(
        { error: "Error actualizando evento de calendario escolar" },
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

  const calendarioId = parseId(id)

  if (!calendarioId) {
    return Response.json(
      { error: "ID inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async ({ tenantId }) => {

    try {

      const result =
        await eliminarCalendarioEscolar(
          calendarioId,
          tenantId
        )

      return Response.json(result)

    }
    catch (error) {

      if (error instanceof EliminarNotFound) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error(
        "Error eliminando evento de calendario escolar:",
        error
      )

      return Response.json(
        { error: "Error eliminando evento de calendario escolar" },
        { status: 500 }
      )
    }
  })
}

