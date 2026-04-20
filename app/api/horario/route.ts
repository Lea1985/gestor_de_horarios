// app/api/horario/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerHorarioSemana, SemanaObligatoriaError, FiltroObligatorioError } from "@/lib/usecases/horario/obtenerHorarioSemana"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)
    try {
      const result = await obtenerHorarioSemana(tenantId, {
        semana:       searchParams.get("semana"),
        asignacionId: searchParams.get("asignacionId"),
        unidadId:     searchParams.get("unidadId"),
        comisionId:   searchParams.get("comisionId"),
      })
      return Response.json(result)
    } catch (error) {
      if (error instanceof SemanaObligatoriaError || error instanceof FiltroObligatorioError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      console.error("Error obteniendo horario:", error)
      return Response.json({ error: "Error obteniendo horario" }, { status: 500 })
    }
  })
}