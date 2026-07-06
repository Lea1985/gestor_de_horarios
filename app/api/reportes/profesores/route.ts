// app/api/reportes/profesores/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosProfesores } from "@/lib/pdf/datasets/profesores"
import { construirDocProfesores } from "@/lib/pdf/documents/profesores"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const filtroRaw = searchParams.get("filtro") ?? "todos"
  const filtro = (["todos", "planta", "suplentes"].includes(filtroRaw) ? filtroRaw : "todos") as "todos" | "planta" | "suplentes"
  const formato = searchParams.get("formato") // "json" | null (default: pdf)

  return withContext(req, async ({ tenantId }) => {
    try {
      const filas = await obtenerDatosProfesores(tenantId, filtro)

      // Vista en pantalla: devuelve los datos crudos como JSON
      if (formato === "json") {
        return Response.json({ datos: filas, filtro })
      }

      // Descarga: genera el PDF
      const institucion = await miInstitucionRepository.obtener(tenantId)
      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }

      const doc = construirDocProfesores(institucion, filas, filtro)

      return respuestaPDF(doc, `profesores_${filtro}.pdf`)
    } catch (error) {
      console.error("Error generando reporte de profesores:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}