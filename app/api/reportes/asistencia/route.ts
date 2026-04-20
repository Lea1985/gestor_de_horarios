import { withContext } from "@/lib/auth/withContext"

import {
  obtenerReporteAsistencia,
  ReporteAsistenciaInvalidoError,
} from "@/lib/usecases/reportes/obtenerReporteAsistencia"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const asignacionId = searchParams.get("asignacionId")
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  // Validación básica de parámetros
  if (!asignacionId || !desde || !hasta) {
    return Response.json(
      { error: "Parámetros inválidos" },
      { status: 400 }
    )
  }

  // Validación de formato de asignacionId
  if (isNaN(Number(asignacionId))) {
    return Response.json(
      { error: "asignacionId inválido" },
      { status: 400 }
    )
  }

  return withContext(req, async (ctx) => {
    try {
      const reporte = await obtenerReporteAsistencia(
        ctx,
        asignacionId, // se mantiene string (consistente con tu usecase)
        desde,
        hasta
      )

      return Response.json(reporte)

    } catch (error) {

      if (error instanceof ReporteAsistenciaInvalidoError) {
        return Response.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return Response.json(
        { error: "Error generando reporte" },
        { status: 500 }
      )
    }
  })
}