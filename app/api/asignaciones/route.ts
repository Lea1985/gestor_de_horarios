import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ===== GET (listado) =====
export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const asignaciones = await prisma.asignacion.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null
      },
      include: {
        agente: true,
        unidad: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return Response.json(asignaciones)

  }, req)
}


// ===== POST (crear asignación) =====
export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    let body

    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 })
    }

    const {
      agenteId,
      unidadId,
      identificadorEstructural,
      fecha_inicio,
      fecha_fin
    } = body

    // 🔴 Validaciones básicas
    if (!agenteId || !unidadId || !identificadorEstructural || !fecha_inicio) {
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios" }),
        { status: 400 }
      )
    }

    // ================================
    // 🔍 Verificar existencia de agente (FIX MULTI-TENANT)
    // ================================
    const agente = await prisma.agente.findFirst({
      where: {
        id: agenteId,
        deletedAt: null,
        instituciones: {
          some: {
            institucionId: tenantId
          }
        }
      }
    })

    if (!agente) {
      return new Response(
        JSON.stringify({ error: "Agente no encontrado" }),
        { status: 404 }
      )
    }

    // ================================
    // 🔍 Verificar existencia de unidad
    // ================================
    const unidad = await prisma.unidadOrganizativa.findFirst({
      where: {
        id: unidadId,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!unidad) {
      return new Response(
        JSON.stringify({ error: "Unidad no encontrada" }),
        { status: 404 }
      )
    }

    // ================================
    // 💾 CREAR ASIGNACIÓN
    // ================================
    try {
      const nueva = await prisma.asignacion.create({
        data: {
          institucionId: tenantId,
          agenteId,
          unidadId,
          identificadorEstructural,
          fecha_inicio: new Date(fecha_inicio),
          fecha_fin: fecha_fin ? new Date(fecha_fin) : null
        }
      })

      return Response.json(nueva)

    } catch (error: any) {

      // 🔴 Unique constraints
      if (error.code === "P2002") {

        if (error.meta?.target?.includes("identificadorEstructural")) {
          return new Response(
            JSON.stringify({ error: "Identificador estructural duplicado" }),
            { status: 409 }
          )
        }

        if (error.meta?.target?.includes("agenteId")) {
          return new Response(
            JSON.stringify({ error: "El agente ya tiene asignación en esta unidad" }),
            { status: 409 }
          )
        }

        return new Response(
          JSON.stringify({ error: "Error de duplicación" }),
          { status: 409 }
        )
      }

      throw error
    }

  }, req)
}