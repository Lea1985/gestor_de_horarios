// app/api/periodos-operativos/[id]/restaurar/route.ts

import { withContext } from "@/lib/auth/withContext"
import {
  restaurarPeriodo,
  PeriodoNoEliminadoError,
} from "@/lib/usecases/periodosOperativos/restaurarPeriodo"

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
      const resultado = await restaurarPeriodo(periodoId, tenantId)
      return Response.json(resultado)
    } catch (error) {
      if (error instanceof PeriodoNoEliminadoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      console.error("Error restaurando período:", error)
      return Response.json({ error: "Error restaurando período" }, { status: 500 })
    }
  })
}