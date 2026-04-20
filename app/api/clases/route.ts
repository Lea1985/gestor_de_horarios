//app/api/clases/route.ts
import { withContext } from "@/lib/auth/withContext"
import { listarClases, FiltrosInsuficientesError, EstadoInvalidoError } from "@/lib/usecases/clases/listarClases"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)

    try {
      const clases = await listarClases(tenantId, {
        asignacionId: searchParams.get("asignacionId"),
        moduloId:     searchParams.get("moduloId"),
        unidadId:     searchParams.get("unidadId"),
        comisionId:   searchParams.get("comisionId"),
        estado:       searchParams.get("estado"),
        fecha_desde:  searchParams.get("fecha_desde"),
        fecha_hasta:  searchParams.get("fecha_hasta"),
      })
      return Response.json(clases)
    } catch (error) {
      if (error instanceof FiltrosInsuficientesError || error instanceof EstadoInvalidoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      console.error("Error listando clases:", error)
      return Response.json({ error: "Error listando clases" }, { status: 500 })
    }
  })
}