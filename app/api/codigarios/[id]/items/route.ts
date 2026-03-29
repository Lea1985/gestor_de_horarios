import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ================================
// GET ITEMS
// ================================

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id } = await context.params
    const codigarioId = Number(id)

    if (isNaN(codigarioId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    const items = await prisma.codigarioItem.findMany({
      where: {
        codigarioId,
        deletedAt: null,
        codigario: {
          institucionId: tenantId
        }
      },
      orderBy: { createdAt: "asc" }
    })

    return Response.json(items)

  }, req)
}


// ================================
// CREATE ITEM
// ================================

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id } = await context.params
    const codigarioId = Number(id)

    if (isNaN(codigarioId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    const body = await req.json()

    // ✅ validación básica
    if (!body.codigo || !body.nombre) {
      return new Response(
        JSON.stringify({ error: "Código y nombre son obligatorios" }),
        { status: 400 }
      )
    }

    // 🔒 validar que el codigario pertenece al tenant
    const codigario = await prisma.codigario.findFirst({
      where: {
        id: codigarioId,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!codigario) {
      return new Response(
        JSON.stringify({ error: "Codigario no encontrado" }),
        { status: 404 }
      )
    }

    try {

      const nuevo = await prisma.codigarioItem.create({
        data: {
          codigo: body.codigo,
          nombre: body.nombre,
          descripcion: body.descripcion,
          codigarioId // 👈 mejor que connect
        }
      })

      return Response.json(nuevo)

    } catch (e: any) {

      if (e.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Código duplicado" }),
          { status: 409 }
        )
      }

      return new Response(
        JSON.stringify({ error: "Error al crear item" }),
        { status: 500 }
      )
    }

  }, req)
}