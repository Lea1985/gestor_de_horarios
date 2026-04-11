// app/api/clases/generar/route.ts
// Genera ClaseProgramada para cada módulo de una distribución horaria
// en el rango de fechas indicado. Es idempotente: omite clases ya existentes.

import { withContext } from "@/lib/auth/withContext"
import prisma from "@/lib/prisma"

// Días de la semana → número JS (0 = domingo)
const DIA_MAP: Record<string, number> = {
  DOMINGO:   0,
  LUNES:     1,
  MARTES:    2,
  MIERCOLES: 3,
  JUEVES:    4,
  VIERNES:   5,
  SABADO:    6,
}

function generarFechas(diaSemana: string, desde: Date, hasta: Date): Date[] {
  const fechas: Date[] = []
  const diaTarget = DIA_MAP[diaSemana]
  const cursor = new Date(desde)

  while (cursor.getDay() !== diaTarget) {
    cursor.setDate(cursor.getDate() + 1)
  }

  while (cursor <= hasta) {
    fechas.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  return fechas
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body: {
      distribucionHorariaId: number
      fecha_desde: string
      fecha_hasta: string
    }

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { distribucionHorariaId, fecha_desde, fecha_hasta } = body

    if (!distribucionHorariaId || !fecha_desde || !fecha_hasta) {
      return Response.json(
        { error: "distribucionHorariaId, fecha_desde y fecha_hasta son obligatorios" },
        { status: 400 }
      )
    }

    const desde = new Date(fecha_desde)
    const hasta = new Date(fecha_hasta)

    if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
      return Response.json({ error: "Fechas inválidas" }, { status: 400 })
    }

    if (desde > hasta) {
      return Response.json(
        { error: "fecha_desde debe ser anterior a fecha_hasta" },
        { status: 400 }
      )
    }

    // Cargar distribución con sus módulos y asignación completa
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: {
        id:            distribucionHorariaId,
        institucionId: tenantId,
        activo:        true,
      },
      include: {
        distribucionModulos: {
          include: { moduloHorario: true },
        },
        asignacion: {
          select: {
            id:         true,
            unidadId:   true,
            comisionId: true, // incluido del nuevo schema
          },
        },
      },
    })

    if (!distribucion) {
      return Response.json({ error: "Distribución no encontrada" }, { status: 404 })
    }

    // Validar vigencia
    if (desde < distribucion.fecha_vigencia_desde) {
      return Response.json(
        { error: "fecha_desde es anterior a la vigencia de la distribución" },
        { status: 400 }
      )
    }

    if (distribucion.fecha_vigencia_hasta && hasta > distribucion.fecha_vigencia_hasta) {
      return Response.json(
        { error: "fecha_hasta supera la vigencia de la distribución" },
        { status: 400 }
      )
    }

    // Generar clases (idempotente)
    let creadas  = 0
    let omitidas = 0

    for (const dm of distribucion.distribucionModulos) {
      const modulo = dm.moduloHorario
      const fechas = generarFechas(modulo.dia_semana, desde, hasta)

      for (const fecha of fechas) {
        const existente = await prisma.claseProgramada.findFirst({
          where: {
            institucionId: tenantId,
            asignacionId:  distribucion.asignacionId,
            moduloId:      modulo.id,
            unidadId:      distribucion.asignacion.unidadId,
            fecha,
          },
          select: { id: true },
        })

        if (existente) {
          omitidas++
          continue
        }

        await prisma.claseProgramada.create({
          data: {
            institucionId: tenantId,
            asignacionId:  distribucion.asignacionId,
            moduloId:      modulo.id,
            unidadId:      distribucion.asignacion.unidadId,
            // Propagar comisionId si la asignación la tiene — permite
            // queries directas por comisión en ClaseProgramada
            comisionId:    distribucion.asignacion.comisionId ?? null,
            fecha,
            estado:        "PROGRAMADA",
          },
        })

        creadas++
      }
    }

    return Response.json({
      ok:                   true,
      distribucionHorariaId,
      rango:                { desde: fecha_desde, hasta: fecha_hasta },
      creadas,
      omitidas,
    })
  })
}