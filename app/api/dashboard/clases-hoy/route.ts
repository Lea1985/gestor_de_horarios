// app/api/dashboard/clases-hoy/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerClasesOperativasHoy } from "@/lib/reporting/datasets/obtenerClasesOperativas"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const clases = await obtenerClasesOperativasHoy(tenantId)
      return Response.json(clases)
    } catch (error) {
      console.error("Error obteniendo clases de hoy:", error)
      return Response.json({ error: "Error obteniendo clases de hoy" }, { status: 500 })
    }
  })
}