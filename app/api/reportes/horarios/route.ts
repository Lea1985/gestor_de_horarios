// app/api/reportes/horarios/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosHorarios } from "@/lib/pdf/datasets/horarios"
import { construirDocHorarios } from "@/lib/pdf/documents/horarios"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const comisionId = Number(searchParams.get("comisionId"))
  const aCargoAhora = searchParams.get("aCargoAhora") === "true"
  const formato = searchParams.get("formato") // "json" | null (default: pdf)

  if (!comisionId || isNaN(comisionId)) {
    return Response.json({ error: "comisionId es obligatorio" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const datos = await obtenerDatosHorarios(tenantId, comisionId, aCargoAhora)

      if (!datos) {
        return Response.json({ error: "Comisión no encontrada" }, { status: 404 })
      }

      // Vista en pantalla: devuelve los datos crudos como JSON
      if (formato === "json") {
        return Response.json({ datos, conACargoAhora: aCargoAhora })
      }

      // Descarga: genera el PDF
      const institucion = await miInstitucionRepository.obtener(tenantId)
      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }

      const doc = construirDocHorarios(institucion, datos, aCargoAhora)
      const nombreArchivo = `horarios_${datos.comision.nombre.replace(/\s+/g, "_")}.pdf`

      return respuestaPDF(doc, nombreArchivo)
    } catch (error) {
      console.error("Error generando reporte de horarios:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}