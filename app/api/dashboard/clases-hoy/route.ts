// app/api/dashboard/clases-hoy/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerClasesOperativas, obtenerClasesOperativasHoy } from "@/lib/reporting/datasets/obtenerClasesOperativas"
// UX-CLS-001: acepta ?desde=&hasta= opcionales para mostrar un rango en vez
// de solo "hoy" -- si no vienen (caso del Dashboard principal, que sigue
// llamando sin params), se comporta exactamente igual que antes.
export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const desdeParam = searchParams.get("desde")
      const hastaParam = searchParams.get("hasta")
      if (desdeParam && hastaParam) {
        const desde = new Date(desdeParam)
        const hasta = new Date(hastaParam)
        if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
          return Response.json({ error: "Fechas inválidas" }, { status: 400 })
        }
        desde.setUTCHours(0, 0, 0, 0)
        hasta.setUTCHours(23, 59, 59, 999)
        if (desde > hasta) {
          return Response.json({ error: "'desde' debe ser anterior o igual a 'hasta'" }, { status: 400 })
        }
        const clases = await obtenerClasesOperativas(tenantId, desde, hasta)
        return Response.json(clases)
      }
      const clases = await obtenerClasesOperativasHoy(tenantId)
      return Response.json(clases)
    } catch (error) {
      console.error("Error obteniendo clases:", error)
      return Response.json({ error: "Error obteniendo clases" }, { status: 500 })
    }
  })
}