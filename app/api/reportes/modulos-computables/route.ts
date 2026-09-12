// app/api/reportes/modulos-computables/route.ts
import { withContext } from "@/lib/auth/withContext"
import { resolverPeriodo, PeriodoInvalidoError, ParametrosPeriodo } from "@/lib/reporting/resolverPeriodo"
import {
  obtenerModulosComputables,
  obtenerModulosComputablesResumen,
  obtenerAgenteParaHeader,
} from "@/lib/reporting/datasets/obtenerModulosComputables"
import { construirDocModulosComputables } from "@/lib/pdf/documents/modulosComputables"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"

function parseId(value: string | null) {
  if (!value) return null
  const n = Number(value)
  return isNaN(n) ? null : n
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agenteId = parseId(searchParams.get("agenteId"))
  // Default JSON (a diferencia de codigarios, acá el default es JSON porque
  // la pantalla ya estaba pidiendo sin "formato" antes de que existiera el PDF;
  // cambiar el default hubiera roto la vista en pantalla).
  const formato = searchParams.get("formato") // "pdf" | null (default: json)

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

      if (!agenteId) {
        const resumen = await obtenerModulosComputablesResumen(tenantId, periodo)
        if (formato !== "pdf") {
          return Response.json({ modo: "resumen" as const, periodo, resumen })
        }
        const institucion = await miInstitucionRepository.obtener(tenantId)
        if (!institucion) {
          return Response.json({ error: "Institución no encontrada" }, { status: 404 })
        }
        const doc = construirDocModulosComputables(institucion, { modo: "resumen", periodo, resumen })
        return respuestaPDF(doc, "modulos_computables_todos.pdf")
      }

      const resultado = await obtenerModulosComputables(tenantId, agenteId, periodo)
      if (formato !== "pdf") {
        return Response.json({ modo: "detalle" as const, ...resultado })
      }

      const agente = await obtenerAgenteParaHeader(tenantId, agenteId)
      if (!agente) {
        return Response.json({ error: "Agente no encontrado" }, { status: 404 })
      }
      const institucion = await miInstitucionRepository.obtener(tenantId)
      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }
      const doc = construirDocModulosComputables(institucion, {
        modo:                    "detalle",
        agenteNombre:            `${agente.apellido}, ${agente.nombre}`,
        agenteDocumento:         agente.documento,
        periodo,
        totalClases:             resultado.totalClases,
        totalModulosComputables: resultado.totalModulosComputables,
        detalle:                 resultado.detalle,
      })
      const nombreArchivo = `modulos_computables_${agente.apellido}_${agente.nombre}.pdf`.replace(/\s+/g, "_")
      return respuestaPDF(doc, nombreArchivo)
    } catch (error) {
      if (error instanceof PeriodoInvalidoError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      console.error("Error generando reporte de módulos computables:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}
