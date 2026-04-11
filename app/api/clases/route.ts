// app/api/clases/route.ts

import { withContext } from "@/lib/auth/withContext"
import { EstadoClase, Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

const ESTADOS_VALIDOS = Object.values(EstadoClase)

// 🔧 helper para normalizar fechas a inicio/fin de día
function normalizarRango(fechaDesde?: string | null, fechaHasta?: string | null) {
  let gte: Date | undefined
  let lte: Date | undefined

  if (fechaDesde) {
    gte = new Date(fechaDesde)
    gte.setHours(0, 0, 0, 0)
  }

  if (fechaHasta) {
    lte = new Date(fechaHasta)
    lte.setHours(23, 59, 59, 999)
  }

  return { gte, lte }
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)

    const asignacionId = searchParams.get("asignacionId")
    const moduloId     = searchParams.get("moduloId")
    const unidadId     = searchParams.get("unidadId")
    const comisionId   = searchParams.get("comisionId")
    const estado       = searchParams.get("estado")
    const fecha_desde  = searchParams.get("fecha_desde")
    const fecha_hasta  = searchParams.get("fecha_hasta")

    // Validación mínima
    if (!asignacionId && !unidadId && !comisionId && !fecha_desde) {
      return Response.json(
        { error: "Se requiere al menos uno de: asignacionId, unidadId, comisionId, fecha_desde" },
        { status: 400 }
      )
    }

    if (estado && !ESTADOS_VALIDOS.includes(estado as EstadoClase)) {
      return Response.json(
        { error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      )
    }

    const where: Prisma.ClaseProgramadaWhereInput = {
      institucionId: tenantId,
    }

    if (asignacionId) where.asignacionId = parseInt(asignacionId)
    if (moduloId)     where.moduloId     = parseInt(moduloId)
    if (unidadId)     where.unidadId     = parseInt(unidadId)
    if (comisionId)   where.comisionId   = parseInt(comisionId)
    if (estado)       where.estado       = estado as EstadoClase

    // 🔥 CORRECCIÓN IMPORTANTE: rango de fechas normalizado
    if (fecha_desde || fecha_hasta) {
      const { gte, lte } = normalizarRango(fecha_desde, fecha_hasta)

      where.fecha = {}

      if (gte) (where.fecha as Prisma.DateTimeFilter).gte = gte
      if (lte) (where.fecha as Prisma.DateTimeFilter).lte = lte
    }

    const clases = await prisma.claseProgramada.findMany({
      where,
      orderBy: { fecha: "asc" },
      include: {
        modulo: {
          select: {
            dia_semana: true,
            hora_desde: true,
            hora_hasta: true,
          },
        },
        unidad: {
          select: {
            nombre: true,
            codigoUnidad: true,
          },
        },
        comision: {
          select: {
            id: true,
            nombre: true,
          },
        },
        asignacion: {
          select: {
            identificadorEstructural: true,
            agenteId: true,
          },
        },
        incidencia: {
          select: {
            id: true,
            fecha_desde: true,
            fecha_hasta: true,
            observacion: true,
          },
        },
        reemplazos: {
          select: {
            id: true,
            asignacionTitularId: true,
            asignacionSuplenteId: true,
          },
        },
      },
    })

    return Response.json(clases)
  })
}