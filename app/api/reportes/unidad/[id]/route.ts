// app/api/reportes/unidad/[id]/route.ts

import { withContext } from "@/lib/auth/withContext"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  const unidadId = parseInt(idParam)

  if (isNaN(unidadId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)
    const fecha_desde = searchParams.get("fecha_desde")
    const fecha_hasta = searchParams.get("fecha_hasta")

    if (!fecha_desde || !fecha_hasta) {
      return Response.json(
        { error: "fecha_desde y fecha_hasta son obligatorios" },
        { status: 400 }
      )
    }

    const unidad = await prisma.unidadOrganizativa.findFirst({
      where:  { id: unidadId, institucionId: tenantId },
      select: { id: true, nombre: true, tipo: true },
    })

    if (!unidad) {
      return Response.json({ error: "Unidad no encontrada" }, { status: 404 })
    }

    const rango = {
      gte: new Date(fecha_desde),
      lte: new Date(fecha_hasta),
    }

    const clases = await prisma.claseProgramada.findMany({
      where:   { unidadId, institucionId: tenantId, fecha: rango },
      orderBy: { fecha: "asc" },
      include: {
        modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
        asignacion: {
          select: {
            identificadorEstructural: true,
            agente: { select: { nombre: true, apellido: true } },
          },
        },
        reemplazos: {
          where:  { activo: true },
          select: {
            asignacionSuplente: {
              select: { agente: { select: { nombre: true, apellido: true } } },
            },
          },
        },
      },
    })

    const resumen = clases.reduce((acc, c) => {
      acc[c.estado] = (acc[c.estado] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Response.json({
      unidad,
      periodo: { desde: fecha_desde, hasta: fecha_hasta },
      resumen: {
        total:        clases.length,
        programadas:  resumen.PROGRAMADA  ?? 0,
        dictadas:     resumen.DICTADA     ?? 0,
        suspendidas:  resumen.SUSPENDIDA  ?? 0,
        reemplazadas: resumen.REEMPLAZADA ?? 0,
      },
      clases,
    })
  })
}