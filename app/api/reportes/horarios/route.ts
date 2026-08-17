// app/api/reportes/horarios/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosHorarios } from "@/lib/pdf/datasets/horarios"
import { construirDocHorarios } from "@/lib/pdf/documents/horarios"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const comisionIdParam = searchParams.get("comisionId")
  const comisionId = comisionIdParam ? Number(comisionIdParam) : null
  if (comisionIdParam && (isNaN(comisionId as number) || !comisionId)) {
    return Response.json({ error: "comisionId inválido" }, { status: 400 })
  }
  const aCargoAhora = searchParams.get("aCargoAhora") === "true"
  const formato = searchParams.get("formato") // "json" | null (default: pdf)
  return withContext(req, async ({ tenantId }) => {
    try {
      const datos = await obtenerDatosHorarios(tenantId, comisionId, aCargoAhora)
      if (comisionId && datos.length === 0) {
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
      const nombreArchivo = comisionId && datos[0]
        ? `horarios_${datos[0].comision.nombre.replace(/\s+/g, "_")}.pdf`
        : "horarios_institucion.pdf"
      return respuestaPDF(doc, nombreArchivo)
    } catch (error) {
      console.error("Error generando reporte de horarios:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}