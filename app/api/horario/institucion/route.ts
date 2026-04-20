// app/api/horario/institucion/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerHorarioInstitucion, SemanaObligatoriaError } from "@/lib/usecases/horario/obtenerHorarioInstitucion"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)
    try {
      const result = await obtenerHorarioInstitucion(tenantId, searchParams.get("semana"))
      return Response.json(result)
    } catch (error) {
      if (error instanceof SemanaObligatoriaError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      console.error("Error obteniendo horario institución:", error)
      return Response.json({ error: "Error obteniendo horario" }, { status: 500 })
    }
  })
}