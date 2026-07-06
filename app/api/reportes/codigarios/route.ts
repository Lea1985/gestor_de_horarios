// app/api/reportes/codigarios/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosCodigarios } from "@/lib/pdf/datasets/codigarios"
import { construirDocCodigarios } from "@/lib/pdf/documents/codigarios"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const codigarioIdRaw = searchParams.get("codigarioId")
  const codigarioId = codigarioIdRaw ? Number(codigarioIdRaw) : null
  const formato = searchParams.get("formato") // "json" | null (default: pdf)

  return withContext(req, async ({ tenantId }) => {
    try {
      const datos = await obtenerDatosCodigarios(tenantId, codigarioId)

      // Vista en pantalla: devuelve los datos crudos como JSON
      if (formato === "json") {
        return Response.json({ datos })
      }

      // Descarga: genera el PDF
      const institucion = await miInstitucionRepository.obtener(tenantId)
      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }

      const doc = construirDocCodigarios(institucion, datos)
      const nombreArchivo = codigarioId && datos[0]
        ? `codigario_${datos[0].codigarioNombre.replace(/\s+/g, "_")}.pdf`
        : "codigarios.pdf"

      return respuestaPDF(doc, nombreArchivo)
    } catch (error) {
      console.error("Error generando reporte de codigarios:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}