import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ================================
// 🔹 GET
// ================================
export async function GET(req: Request) {
  return withTenant(async (tenantId) => {
    try {
      const unidades = await prisma.unidadOrganizativa.findMany({
        where: {
          institucionId: tenantId,
          deletedAt: null
        }
      })

      return Response.json(unidades, { status: 200 })

    } catch (error) {
      return Response.json(
        {
          error: "Error al obtener unidades",
          code: "INTERNAL_ERROR"
        },
        { status: 500 }
      )
    }
  }, req)
}


// ================================
// 🔹 POST
// ================================
export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    let body

    // 🔹 Parseo JSON
    try {
      body = await req.json()
    } catch {
      return Response.json(
        { error: "JSON inválido", code: "INVALID_JSON" },
        { status: 400 }
      )
    }

    const { codigoUnidad, nombre, tipo } = body

    // 🔹 Validación
    if (codigoUnidad == null || !nombre) {
      return Response.json(
        { error: "Faltan datos obligatorios", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    try {
      const nueva = await prisma.unidadOrganizativa.create({
        data: {
          institucionId: tenantId,
          codigoUnidad,
          nombre,
          tipo
        }
      })

      return Response.json(nueva, { status: 200 })

    } catch (error: any) {

      // 🔴 DUPLICADO
      if (error.code === "P2002") {
        return Response.json(
          {
            error: "Ya existe una unidad con ese código",
            code: "UNIQUE_CONSTRAINT"
          },
          { status: 409 }
        )
      }

      // 🔴 ERROR GENERAL
      console.error("ERROR POST UNIDADES:", error)

      return Response.json(
        {
          error: "Error interno del servidor",
          code: "INTERNAL_ERROR"
        },
        { status: 500 }
      )
    }

  }, req)
}