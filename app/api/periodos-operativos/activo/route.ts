// app/api/periodos-operativos/activo/route.ts

import { withContext } from "@/lib/auth/withContext"
import { obtenerPeriodoActivo } from "@/lib/usecases/periodosOperativos/obtenerPeriodoActivo"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const periodoActivo = await obtenerPeriodoActivo(tenantId)

      if (!periodoActivo) {
        return Response.json(
          { error: "NO_ACTIVE_PERIOD" },
          { status: 404 }
        )
      }

      return Response.json(periodoActivo)
    } catch (error) {
      console.error("Error obteniendo período activo:", error)

      return Response.json(
        { error: "Error interno" },
        { status: 500 }
      )
    }
  })
}