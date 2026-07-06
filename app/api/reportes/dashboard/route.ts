// app/api/reportes/dashboard/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosDashboardPDF } from "@/lib/pdf/datasets/dashboard"
import { construirDocDashboard } from "@/lib/pdf/documents/dashboard"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const [datos, institucion] = await Promise.all([
        obtenerDatosDashboardPDF(tenantId),
        miInstitucionRepository.obtener(tenantId),
      ])

      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }

      const doc = construirDocDashboard(institucion, datos)
      const fecha = new Date().toISOString().split("T")[0]
      return respuestaPDF(doc, `estado_operativo_${fecha}.pdf`)
    } catch (error) {
      console.error("Error generando reporte de dashboard:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}
