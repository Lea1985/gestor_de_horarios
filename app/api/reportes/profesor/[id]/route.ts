// app/api/reportes/profesor/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosProfesor } from "@/lib/pdf/datasets/profesor"
import { construirDocProfesor } from "@/lib/pdf/documents/profesor"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const agenteId = parseId(id)

  if (!agenteId) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const formato = searchParams.get("formato") // "json" | null (default: pdf)

  return withContext(req, async ({ tenantId }) => {
    try {
      const datos = await obtenerDatosProfesor(tenantId, agenteId)
      if (!datos) {
        return Response.json({ error: "Profesor no encontrado" }, { status: 404 })
      }

      // Vista en pantalla: devuelve los datos crudos como JSON
      if (formato === "json") {
        return Response.json({ datos })
      }

      // Descarga: genera el PDF
      const institucion = await miInstitucionRepository.obtener(tenantId)
      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }

      const doc = construirDocProfesor(institucion, datos)
      const nombreArchivo = `profesor_${datos.agente.apellido}_${datos.agente.nombre}.pdf`.replace(/\s+/g, "_")

      return respuestaPDF(doc, nombreArchivo)
    } catch (error) {
      console.error("Error generando ficha de profesor:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}
