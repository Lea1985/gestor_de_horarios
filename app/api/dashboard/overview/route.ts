// app/api/dashboard/overview/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerClasesOperativas } from "@/lib/reporting/datasets/obtenerClasesOperativas"
import { generarTimelineCobertura } from "@/lib/reporting/transformers/generarTimelineCobertura"
import { obtenerKPIsDashboard } from "@/lib/reporting/kpis/obtenerKPIsDashboard"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const hoy = new Date()
      const desde = searchParams.get("fecha_desde") ?? (() => {
        const d = new Date()
        d.setDate(hoy.getDate() - 14)
        return d.toISOString().split("T")[0]
      })()
      const hasta = searchParams.get("fecha_hasta") ?? hoy.toISOString().split("T")[0]

      const desdeDate = new Date(desde)
      const hastaDate = new Date(hasta)

      // 1. Obtener KPIs usando el módulo reporting (sin duplicar)
      const kpis = await obtenerKPIsDashboard(tenantId)

      // 2. Obtener dataset para timeline (mismo período que el frontend pide)
      const clases = await obtenerClasesOperativas(tenantId, desdeDate, hastaDate)
      const timeline = generarTimelineCobertura(clases)

      return Response.json({
        kpis: {
          clasesHoy: kpis.clasesHoy,
          reemplazosActivos: kpis.reemplazosActivos,
          suspendidasHoy: kpis.suspendidasHoy,
          sinCoberturaHoy: kpis.sinCoberturaHoy,
          incidenciasActivas: kpis.incidenciasActivas,
          coberturaPorcentaje: kpis.coberturaPorcentaje,
        },
        coberturaDetalle: kpis.coberturaDetalle, // ← NUEVO
        timeline,
        meta: {
          periodo: { desde, hasta },
          totalClases: clases.length,
        },
      })
    } catch (error) {
      console.error("Error dashboard overview:", error)
      return Response.json({ error: "Error generando dashboard overview" }, { status: 500 })
    }
  })
}