// app/api/reportes/reemplazos/route.ts

import { withContext } from "@/lib/auth/withContext"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
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

    const reemplazos = await prisma.reemplazo.findMany({
      where: {
        activo: true,
        clase: {
          institucionId: tenantId,
          fecha: {
            gte: new Date(fecha_desde),
            lte: new Date(fecha_hasta),
          },
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        clase: {
          select: {
            fecha:  true,
            estado: true,
            modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
            unidad: { select: { nombre: true } },
          },
        },
        asignacionTitular: {
          select: {
            identificadorEstructural: true,
            agente: { select: { nombre: true, apellido: true, documento: true } },
          },
        },
        asignacionSuplente: {
          select: {
            identificadorEstructural: true,
            agente: { select: { nombre: true, apellido: true, documento: true } },
          },
        },
      },
    })

    // Agrupar por suplente para el resumen
    const porSuplente: Record<number, { agente: unknown; cantidad: number }> = {}

    for (const r of reemplazos) {
      const id = r.asignacionSuplenteId
      if (!porSuplente[id]) {
        porSuplente[id] = { agente: r.asignacionSuplente.agente, cantidad: 0 }
      }
      porSuplente[id].cantidad++
    }

    return Response.json({
      periodo:     { desde: fecha_desde, hasta: fecha_hasta },
      total:       reemplazos.length,
      porSuplente: Object.values(porSuplente).sort((a, b) => b.cantidad - a.cantidad),
      reemplazos,
    })
  })
}