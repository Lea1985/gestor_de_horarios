// app/api/dashboard/cobertura-comisiones/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerCoberturaPorComision } from "@/lib/reporting/datasets/obtenerCoberturaPorComision"

const RANGOS_VALIDOS = [7, 14, 30] as const
type RangoDias = (typeof RANGOS_VALIDOS)[number]

function esRangoValido(n: number): n is RangoDias {
  return RANGOS_VALIDOS.includes(n as RangoDias)
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)

      const diasRaw = Number(searchParams.get("dias"))
      const dias: RangoDias = esRangoValido(diasRaw) ? diasRaw : 14

      const limiteRaw = Number(searchParams.get("limite"))
      const limite = limiteRaw >= 1 && limiteRaw <= 20 ? limiteRaw : 3

      const comisionIdRaw = searchParams.get("comisionId")
      const comisionId = comisionIdRaw ? Number(comisionIdRaw) : undefined

      const data = await obtenerCoberturaPorComision(tenantId, dias, limite, comisionId)

      return Response.json(data)
    } catch (error) {
      console.error("Error cobertura-comisiones:", error)
      return Response.json({ error: "Error obteniendo cobertura por comisión" }, { status: 500 })
    }
  })
}
