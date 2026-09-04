// app/api/calendario-escolar/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  eliminarCalendarioEscolar,
  CalendarioEscolarNoEncontradoError as CalendarioEscolarNoEncontradoErrorAlEliminar,
  PeriodoCerradoError as PeriodoCerradoErrorAlEliminar,
} from "@/lib/usecases/calendarioEscolar/eliminarCalendarioEscolar"
import {
  actualizarCalendarioEscolar,
  CalendarioEscolarNoEncontradoError as CalendarioEscolarNoEncontradoErrorAlActualizar,
  SinCamposParaActualizarError,
  FechaFueraDePeriodoError,
  PeriodoCerradoError as PeriodoCerradoErrorAlActualizar,
  EventoDuplicadoError,
} from "@/lib/usecases/calendarioEscolar/actualizarCalendarioEscolar"
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
      if (error instanceof CalendarioEscolarNoEncontradoErrorAlEliminar) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error instanceof PeriodoCerradoErrorAlEliminar) {
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
// PATCH: faltaba por completo -- el frontend (app/protected/dashboard/
// calendario/page.tsx, función guardar()) ya llama a PATCH
// /api/calendario-escolar/[id] al editar, pero esta ruta solo tenía
// DELETE. El usecase actualizarCalendarioEscolar existía pero nunca
// estuvo conectado a ningún endpoint (hallazgo 24/08/2026).
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
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const result = await actualizarCalendarioEscolar(calendarioId, tenantId, body)
      return Response.json(result)
    } catch (error) {
      if (error instanceof CalendarioEscolarNoEncontradoErrorAlActualizar) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof SinCamposParaActualizarError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof FechaFueraDePeriodoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof PeriodoCerradoErrorAlActualizar) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      if (error instanceof EventoDuplicadoError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      console.error("Error actualizando evento de calendario escolar:", error)
      return Response.json(
        { error: "Error actualizando evento de calendario escolar" },
        { status: 500 }
      )
    }
  })
}