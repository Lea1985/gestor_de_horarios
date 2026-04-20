import { withContext } from "@/lib/auth/withContext"

import {
  obtenerReporteAgente,
  ReporteAgenteInvalidoError,
  AgenteNoEncontradoError,
} from "@/lib/usecases/reportes/obtenerReporteAgente"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const agenteId = parseId(id)

  if (!agenteId) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("fecha_desde")
  const hasta = searchParams.get("fecha_hasta")

  return withContext(req, async (ctx) => {
    try {
      const reporte = await obtenerReporteAgente(
        ctx,
        agenteId,
        desde!,
        hasta!
      )

      return Response.json(reporte)

    } catch (error) {

      if (error instanceof ReporteAgenteInvalidoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }

      if (error instanceof AgenteNoEncontradoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }

      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}