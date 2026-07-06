// app/api/periodos-operativos/[id]/activar/route.ts

import { withContext } from "@/lib/auth/withContext"

import {
  activarPeriodo,
  PeriodoNoEncontradoError,
  PeriodoNoEsBorradorError,
  YaHayPeriodoActivoError,
} from "@/lib/usecases/periodosOperativos/activarPeriodo"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const periodoId = parseId(id)

  if (!periodoId) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const result = await activarPeriodo(tenantId, periodoId)
      return Response.json(result)
    } catch (error) {
      if (error instanceof PeriodoNoEncontradoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof PeriodoNoEsBorradorError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      if (error instanceof YaHayPeriodoActivoError) {
        return Response.json(
          { error: error.message, periodoActivoId: error.periodoActivoId },
          { status: 409 }
        )
      }
      console.error("Error activando período:", error)
      return Response.json({ error: "Error activando período" }, { status: 500 })
    }
  })
}
