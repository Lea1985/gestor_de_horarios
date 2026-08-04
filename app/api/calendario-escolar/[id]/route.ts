// app/api/calendario-escolar/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  eliminarCalendarioEscolar,
  CalendarioEscolarNoEncontradoError,
  PeriodoCerradoError,
} from "@/lib/usecases/calendarioEscolar/eliminarCalendarioEscolar"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
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
      const result = await eliminarCalendarioEscolar(calendarioId, tenantId)
      return Response.json(result)
    }
    catch (error) {
      if (error instanceof CalendarioEscolarNoEncontradoError) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error instanceof PeriodoCerradoError) {
        return Response.json(
          { error: error.message },
          { status: 409 }
        )
      }
      console.error("Error eliminando evento de calendario escolar:", error)
      return Response.json(
        { error: "Error eliminando evento de calendario escolar" },
        { status: 500 }
      )
    }
  })
}