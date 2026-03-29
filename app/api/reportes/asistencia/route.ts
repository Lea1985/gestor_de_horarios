// app/api/reportes/asistencia/route.ts
import { withTenant } from "@/lib/tenant/withTenant"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const { searchParams } = new URL(req.url)
    const asignacionId = searchParams.get("asignacionId")
    const fecha_desde  = searchParams.get("fecha_desde")
    const fecha_hasta  = searchParams.get("fecha_hasta")

    if (!asignacionId || !fecha_desde || !fecha_hasta) {
      return Response.json(
        { error: "asignacionId, fecha_desde y fecha_hasta son obligatorios" },
        { status: 400 }
      )
    }

    const donde = {
      institucionId: tenantId,
      asignacionId:  parseInt(asignacionId),
      fecha: {
        gte: new Date(fecha_desde),
        lte: new Date(fecha_hasta)
      }
    }

    const [programadas, dictadas, suspendidas, reemplazadas] = await Promise.all([
      prisma.claseProgramada.count({ where: { ...donde, estado: "PROGRAMADA"  } }),
      prisma.claseProgramada.count({ where: { ...donde, estado: "DICTADA"     } }),
      prisma.claseProgramada.count({ where: { ...donde, estado: "SUSPENDIDA"  } }),
      prisma.claseProgramada.count({ where: { ...donde, estado: "REEMPLAZADA" } }),
    ])

    const total = programadas + dictadas + suspendidas + reemplazadas

    const clases = await prisma.claseProgramada.findMany({
      where: donde,
      orderBy: { fecha: "asc" },
      select: {
        id:     true,
        fecha:  true,
        estado: true,
        modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
        unidad: { select: { nombre: true } },
        incidencia: {
          select: {
            id:           true,
            fecha_desde:  true,
            fecha_hasta:  true,
            observacion:  true,
            codigarioItem: { select: { codigo: true, nombre: true } }
          }
        }
      }
    })

    return Response.json({
      asignacionId:  parseInt(asignacionId),
      periodo:       { desde: fecha_desde, hasta: fecha_hasta },
      resumen: {
        total,
        programadas,
        dictadas,
        suspendidas,
        reemplazadas,
        porcentajeDictadas:   total > 0 ? Math.round((dictadas   / total) * 100) : 0,
        porcentajeSuspendidas: total > 0 ? Math.round((suspendidas / total) * 100) : 0,
      },
      clases
    })

  }, req)
}