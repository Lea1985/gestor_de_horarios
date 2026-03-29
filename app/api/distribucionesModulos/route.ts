import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"


// ===== POST =====
export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    let body

    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400 }
      )
    }

    const {
      distribucionHorariaId,
      moduloHorarioId
    } = body

    // 🔴 Validación básica
    if (!distribucionHorariaId || !moduloHorarioId) {
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios" }),
        { status: 400 }
      )
    }

    // 🔒 Validar distribución (multi-tenant + activa)
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: {
        id: distribucionHorariaId,
        institucionId: tenantId,
        deletedAt: null,
        activo: true
      }
    })

    if (!distribucion) {
      return new Response(
        JSON.stringify({ error: "Distribución no encontrada" }),
        { status: 404 }
      )
    }

    // 🔍 (Opcional pero recomendable) validar que el módulo exista
    const modulo = await prisma.moduloHorario.findUnique({
      where: {
        id: moduloHorarioId
      }
    })

    if (!modulo) {
      return new Response(
        JSON.stringify({ error: "Módulo horario no encontrado" }),
        { status: 404 }
      )
    }

    try {

      const nueva = await prisma.distribucionModulo.create({
        data: {
          distribucionHorariaId,
          moduloHorarioId
        }
      })

      return Response.json(nueva)

    } catch (error: any) {

      // 🔁 ya existe (PK compuesta)
      if (error.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "El módulo ya está asignado a la distribución" }),
          { status: 409 }
        )
      }

      throw error
    }

  }, req)
}


// ===== GET =====
export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const items = await prisma.distribucionModulo.findMany({
      where: {
        distribucionHoraria: {
          institucionId: tenantId,
          deletedAt: null,
          activo: true
        }
      },
      include: {
        moduloHorario: true,
        distribucionHoraria: {
          select: {
            id: true,
            asignacionId: true,
            version: true,
            fecha_vigencia_desde: true,
            fecha_vigencia_hasta: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return Response.json(items)

  }, req)
}