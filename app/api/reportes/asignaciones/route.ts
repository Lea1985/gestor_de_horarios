// app/api/reportes/asignaciones/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosAsignaciones } from "@/lib/pdf/datasets/asignaciones"
import { construirDocAsignaciones } from "@/lib/pdf/documents/asignaciones"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const comisionIdRaw = searchParams.get("comisionId")
  const agenteIdRaw    = searchParams.get("agenteId")
  const formato        = searchParams.get("formato") // "json" | null (default: pdf)

  if (comisionIdRaw && (isNaN(Number(comisionIdRaw)) || !Number(comisionIdRaw))) {
    return Response.json({ error: "comisionId inválido" }, { status: 400 })
  }
  if (agenteIdRaw && (isNaN(Number(agenteIdRaw)) || !Number(agenteIdRaw))) {
    return Response.json({ error: "agenteId inválido" }, { status: 400 })
  }

  const comisionId = comisionIdRaw ? Number(comisionIdRaw) : null
  const agenteId   = agenteIdRaw   ? Number(agenteIdRaw)   : null

  return withContext(req, async ({ tenantId }) => {
    try {
      const filas = await obtenerDatosAsignaciones(tenantId, { comisionId, agenteId })

      const partes: string[] = []
      if (comisionId) {
        const comision = await prisma.comision.findFirst({ where: { id: comisionId, institucionId: tenantId }, select: { nombre: true } })
        if (comision) partes.push(`Comisión: ${comision.nombre}`)
      }
      if (agenteId) {
        const agente = await prisma.agente.findFirst({ where: { id: agenteId, institucionId: tenantId }, select: { nombre: true, apellido: true } })
        if (agente) partes.push(`Profesor: ${agente.apellido}, ${agente.nombre}`)
      }
      const filtroTexto = partes.join(" | ") || undefined

      // Vista en pantalla: devuelve los datos crudos como JSON
      if (formato === "json") {
        return Response.json({ datos: filas, filtroTexto })
      }

      // Descarga: genera el PDF
      const institucion = await miInstitucionRepository.obtener(tenantId)
      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }

      const doc = construirDocAsignaciones(institucion, filas, filtroTexto)

      return respuestaPDF(doc, "asignaciones_distribuciones.pdf")
    } catch (error) {
      console.error("Error generando reporte de asignaciones:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}