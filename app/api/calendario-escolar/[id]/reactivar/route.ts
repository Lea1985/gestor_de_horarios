
// app/api/calendario-escolar/[id]/reactivar/route.ts

import { withContext } from "@/lib/auth/withContext"

import {
  reactivarCalendarioEscolar,
  CalendarioEscolarNoEncontradoError,
} from "@/lib/usecases/calendarioEscolar/reactivarCalendarioEscolar"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
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
        await reactivarCalendarioEscolar(
          calendarioId,
          tenantId
        )

      return Response.json(result)

    }
    catch (error) {

      if (
        error instanceof CalendarioEscolarNoEncontradoError
      ) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      console.error(
        "Error reactivando evento de calendario escolar:",
        error
      )

      return Response.json(
        { error: "Error reactivando evento de calendario escolar" },
        { status: 500 }
      )
    }
  })
}

