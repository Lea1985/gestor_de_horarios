// app/api/reportes/modulos-computables/route.ts
import { withContext } from "@/lib/auth/withContext"
import { resolverPeriodo, PeriodoInvalidoError, ParametrosPeriodo } from "@/lib/reporting/resolverPeriodo"
import { obtenerModulosComputables } from "@/lib/reporting/datasets/obtenerModulosComputables"

function parseId(value: string | null) {
  if (!value) return null
  const n = Number(value)
  return isNaN(n) ? null : n
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const agenteId = parseId(searchParams.get("agenteId"))
  if (!agenteId) {
    return Response.json({ error: "agenteId es obligatorio y debe ser numérico" }, { status: 400 })
  }

  const mesRaw = searchParams.get("mes")
  const anioRaw = searchParams.get("anio")
  const periodoOperativoIdRaw = searchParams.get("periodoOperativoId")
  const desdeRaw = searchParams.get("desde")
  const hastaRaw = searchParams.get("hasta")

  const modosProvistos = [
    !!(mesRaw && anioRaw),
    !!periodoOperativoIdRaw,
    !!(desdeRaw && hastaRaw),
  ].filter(Boolean).length

  if (modosProvistos !== 1) {
    return Response.json(
      { error: "Debe indicarse exactamente una forma de período: (mes y anio) | periodoOperativoId | (desde y hasta)" },
      { status: 400 }
    )
  }

  let params: ParametrosPeriodo
  if (mesRaw && anioRaw) {
    params = { modo: "mes", mes: Number(mesRaw), anio: Number(anioRaw) }
  } else if (periodoOperativoIdRaw) {
    const periodoOperativoId = parseId(periodoOperativoIdRaw)
    if (!periodoOperativoId) {
      return Response.json({ error: "periodoOperativoId inválido" }, { status: 400 })
    }
    params = { modo: "periodoOperativo", periodoOperativoId }
  } else {
    const desde = new Date(desdeRaw!)
    const hasta = new Date(hastaRaw!)
    params = { modo: "rango", desde, hasta }
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const periodo = await resolverPeriodo(tenantId, params)
      const resultado = await obtenerModulosComputables(tenantId, agenteId, periodo)
      return Response.json(resultado)
    } catch (error) {
      if (error instanceof PeriodoInvalidoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      console.error("Error generando reporte de módulos computables:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}