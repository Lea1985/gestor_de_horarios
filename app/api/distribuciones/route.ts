import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    let body

    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 })
    }

    const {
      asignacionId,
      version,
      fecha_vigencia_desde,
      fecha_vigencia_hasta
    } = body

    // 🔴 Validación
    if (!asignacionId || !version || !fecha_vigencia_desde) {
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios" }),
        { status: 400 }
      )
    }

    // 🔍 Verificar asignación
    const asignacion = await prisma.asignacion.findFirst({
      where: {
        id: asignacionId,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!asignacion) {
      return new Response(
        JSON.stringify({ error: "Asignación no encontrada" }),
        { status: 404 }
      )
    }

    // 🔒 Validar solapamiento
    const desde = new Date(fecha_vigencia_desde)
    const hasta = fecha_vigencia_hasta
      ? new Date(fecha_vigencia_hasta)
      : new Date("9999-12-31")

    const conflicto = await prisma.distribucionHoraria.findFirst({
      where: {
        asignacionId,
        deletedAt: null,
        AND: [
          { fecha_vigencia_desde: { lte: hasta } },
          {
            OR: [
              { fecha_vigencia_hasta: null },
              { fecha_vigencia_hasta: { gte: desde } }
            ]
          }
        ]
      }
    })

    if (conflicto) {
      return new Response(
        JSON.stringify({ error: "Existe una distribución en ese rango de fechas" }),
        { status: 409 }
      )
    }

    try {

      const nueva = await prisma.distribucionHoraria.create({
        data: {
          institucionId: tenantId,
          asignacionId,
          version,
          fecha_vigencia_desde: desde,
          fecha_vigencia_hasta: fecha_vigencia_hasta
            ? new Date(fecha_vigencia_hasta)
            : null
        }
      })

      return Response.json(nueva)

    } catch (error: any) {

      if (error.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Ya existe esa versión para la asignación" }),
          { status: 409 }
        )
      }

      throw error
    }

  }, req)
}

export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const distribuciones = await prisma.distribucionHoraria.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null
      },
      include: {
        asignacion: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return Response.json(distribuciones)

  }, req)
}