// app/api/dashboard/rankings/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerRankings, RangoRankings } from "@/lib/reporting/datasets/obtenerRankings"

const RANGOS_VALIDOS = ["todo", "anio", "semestre", "mes"] as const

function esRangoValido(r: string): r is RangoRankings {
  return RANGOS_VALIDOS.includes(r as RangoRankings)
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)

      const rangoRaw = searchParams.get("rango") ?? "anio"
      const rango: RangoRankings = esRangoValido(rangoRaw) ? rangoRaw : "anio"

      const limiteRaw = Number(searchParams.get("limite"))
      const limite = limiteRaw >= 1 && limiteRaw <= 100 ? limiteRaw : 5

      const data = await obtenerRankings(tenantId, rango, limite)

      return Response.json(data)
    } catch (error) {
      console.error("Error dashboard rankings:", error)
      return Response.json({ error: "Error generando rankings" }, { status: 500 })
    }
  })
}
