//app/api/clases/route.ts
import { withContext } from "@/lib/auth/withContext"
import { listarClases, FiltrosInsuficientesError, EstadoInvalidoError } from "@/lib/usecases/clases/listarClases"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)
    try {
      const hoy = searchParams.get("hoy")
      const ahora = new Date()
      const inicioHoy = new Date(ahora)
      inicioHoy.setUTCHours(0, 0, 0, 0)
      const finHoy = new Date(ahora)
      finHoy.setUTCHours(23, 59, 59, 999)
      const clases = await listarClases(tenantId, {
        asignacionId: searchParams.get("asignacionId"),
        moduloId:     searchParams.get("moduloId"),
        unidadId:     searchParams.get("unidadId"),
        comisionId:   searchParams.get("comisionId"),
        estado:       searchParams.get("estado"),
        fecha_desde:
          hoy === "true"
            ? inicioHoy.toISOString()
            : searchParams.get("fecha_desde"),
        fecha_hasta:
          hoy === "true"
            ? finHoy.toISOString()
            : searchParams.get("fecha_hasta"),
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