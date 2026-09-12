// app/api/reportes/ausencias/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerDatosAusencias } from "@/lib/pdf/datasets/ausencias"
import { construirDocAusencias } from "@/lib/pdf/documents/ausencias"
import { respuestaPDF } from "@/lib/pdf/generator"
import { miInstitucionRepository } from "@/lib/repositories/miInstitucionRepository"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const desdeRaw      = searchParams.get("desde")
  const hastaRaw       = searchParams.get("hasta")
  const comisionIdRaw  = searchParams.get("comisionId")
  const agenteIdRaw    = searchParams.get("agenteId")
  const formato        = searchParams.get("formato") // "json" | null (default: pdf)

  if (!desdeRaw || !hastaRaw) {
    return Response.json({ error: "desde y hasta son obligatorios" }, { status: 400 })
  }

  const desde = new Date(desdeRaw)
  const hasta = new Date(hastaRaw)
  if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
    return Response.json({ error: "Fechas inválidas" }, { status: 400 })
  }
  if (desde.getTime() > hasta.getTime()) {
    return Response.json({ error: "desde no puede ser posterior a hasta" }, { status: 400 })
  }

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
      const filas = await obtenerDatosAusencias(tenantId, { desde, hasta, comisionId, agenteId })

      // Texto descriptivo de filtros aplicados
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
        return Response.json({ datos: filas, periodo: { desde: desdeRaw, hasta: hastaRaw }, filtroTexto })
      }

      // Descarga: genera el PDF
      const institucion = await miInstitucionRepository.obtener(tenantId)
      if (!institucion) {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }

      const doc = construirDocAusencias(institucion, filas, { desde, hasta }, filtroTexto)

      return respuestaPDF(doc, `ausencias_${desdeRaw}_${hastaRaw}.pdf`)
    } catch (error) {
      console.error("Error generando reporte de ausencias:", error)
      return Response.json({ error: "Error generando reporte" }, { status: 500 })
    }
  })
}
