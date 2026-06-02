// app/api/reportes/unidad/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  obtenerReporteUnidad,
  ReporteUnidadInvalidoError,
  UnidadNoEncontradaError,
} from "@/lib/usecases/reportes/obtenerReporteUnidad"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const unidadId = parseInt(id)
  if (isNaN(unidadId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const fecha_desde = searchParams.get("fecha_desde")
  const fecha_hasta = searchParams.get("fecha_hasta")

  return withContext(req, async (ctx) => {
    try {
      const reporte = await obtenerReporteUnidad(ctx, unidadId, fecha_desde, fecha_hasta)
      return Response.json(reporte)
    } catch (error) {
      if (error instanceof ReporteUnidadInvalidoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof UnidadNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      console.error(error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}