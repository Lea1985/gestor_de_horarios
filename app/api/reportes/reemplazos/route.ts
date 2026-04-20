import { withContext } from "@/lib/auth/withContext"

import {
  obtenerReporteReemplazos,
  ReporteReemplazosInvalidoError,
} from "@/lib/usecases/reportes/obtenerReporteReemplazos"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const desde = searchParams.get("fecha_desde")
  const hasta = searchParams.get("fecha_hasta")

  return withContext(req, async (ctx) => {
    try {
      const reporte = await obtenerReporteReemplazos(
        ctx,
        desde,
        hasta
      )

      return Response.json(reporte)

    } catch (error) {
      if (error instanceof ReporteReemplazosInvalidoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }

      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}