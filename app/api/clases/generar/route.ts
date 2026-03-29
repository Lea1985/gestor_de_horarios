// app/api/clases/generar/route.ts
import { withTenant } from "@/lib/tenant/withTenant"
import prisma from "@/lib/prisma"

// ================================
// 🔹 Días de la semana → número JS (0=domingo)
// ================================
const DIA_MAP: Record<string, number> = {
  DOMINGO:   0,
  LUNES:     1,
  MARTES:    2,
  MIERCOLES: 3,
  JUEVES:    4,
  VIERNES:   5,
  SABADO:    6
}

// ================================
// 🔹 Generar todas las fechas de un día de semana en un rango
// ================================
function generarFechas(
  diaSemana: string,
  desde: Date,
  hasta: Date
): Date[] {
  const fechas: Date[] = []
  const diaTarget = DIA_MAP[diaSemana]
  const cursor = new Date(desde)

  // Avanzar hasta el primer día que coincida
  while (cursor.getDay() !== diaTarget) {
    cursor.setDate(cursor.getDate() + 1)
  }

  // Generar todas las ocurrencias hasta fecha_hasta
  while (cursor <= hasta) {
    fechas.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  return fechas
}

// ================================
// 🔹 POST /api/clases/generar
// ================================
export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    // ── Body ──────────────────────────────────────────────
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

    // ── Cargar distribución con sus módulos ───────────────
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: {
        id: distribucionHorariaId,
        institucionId: tenantId,
        activo: true
      },
      include: {
        distribucionModulos: {
          include: {
            moduloHorario: true
          }
        },
        asignacion: true
      }
    })

    if (!distribucion) {
      return Response.json(
        { error: "Distribución no encontrada" },
        { status: 404 }
      )
    }

    // ── Validar que el rango esté dentro de la vigencia ───
    if (desde < distribucion.fecha_vigencia_desde) {
      return Response.json(
        { error: "fecha_desde es anterior a la vigencia de la distribución" },
        { status: 400 }
      )
    }

    if (
      distribucion.fecha_vigencia_hasta &&
      hasta > distribucion.fecha_vigencia_hasta
    ) {
      return Response.json(
        { error: "fecha_hasta supera la vigencia de la distribución" },
        { status: 400 }
      )
    }

    // ── Generar clases (idempotente) ──────────────────────
    let creadas = 0
    let omitidas = 0

    for (const dm of distribucion.distribucionModulos) {
      const modulo = dm.moduloHorario
      const fechas = generarFechas(modulo.dia_semana, desde, hasta)

      for (const fecha of fechas) {
        // Verificar si ya existe (idempotencia)
        const existente = await prisma.claseProgramada.findFirst({
          where: {
            institucionId: tenantId,
            asignacionId:  distribucion.asignacionId,
            moduloId:      modulo.id,
            unidadId:      distribucion.asignacion.unidadId,
            fecha
          }
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
            fecha,
            estado:        "PROGRAMADA"
          }
        })

        creadas++
      }
    }

    return Response.json({
      ok: true,
      distribucionHorariaId,
      rango: { desde: fecha_desde, hasta: fecha_hasta },
      creadas,
      omitidas
    })

  }, req)
}