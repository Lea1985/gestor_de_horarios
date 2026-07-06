// app/api/periodos-operativos/[id]/cerrar/route.ts

import { withContext } from "@/lib/auth/withContext"

import {
  cerrarPeriodo,
  PeriodoNoEncontradoError,
  PeriodoNoEsActivoError,
} from "@/lib/usecases/periodosOperativos/cerrarPeriodo"

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
      const result = await cerrarPeriodo(tenantId, periodoId)
      return Response.json(result)
    } catch (error) {
      if (error instanceof PeriodoNoEncontradoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof PeriodoNoEsActivoError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      console.error("Error cerrando período:", error)
      return Response.json({ error: "Error cerrando período" }, { status: 500 })
    }
  })
}
