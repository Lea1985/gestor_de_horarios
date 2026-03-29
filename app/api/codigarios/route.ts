import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ================================
// GET ALL
// ================================

export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const codigarios = await prisma.codigario.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null
      },
      orderBy: { createdAt: "desc" }
    })

    return Response.json(codigarios)

  }, req)
}


// ================================
// CREATE
// ================================

export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    const body = await req.json()

    // ✅ validación básica
    if (!body.nombre) {
      return new Response(
        JSON.stringify({ error: "Nombre obligatorio" }),
        { status: 400 }
      )
    }

    // 🔥 NORMALIZACIÓN CLAVE (SOLUCIONA TU TEST)
    const nombreNormalizado = body.nombre.trim().toUpperCase()

    try {

      const nuevo = await prisma.codigario.create({
        data: {
          nombre: nombreNormalizado,
          descripcion: body.descripcion,
          institucionId: tenantId
        }
      })

      return Response.json(nuevo)

    } catch (e: any) {

      // 🔥 manejo de duplicados (ahora sí va a funcionar)
      if (e.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Codigario duplicado" }),
          { status: 409 }
        )
      }

      return new Response(
        JSON.stringify({ error: "Error al crear codigario" }),
        { status: 500 }
      )
    }

  }, req)
}