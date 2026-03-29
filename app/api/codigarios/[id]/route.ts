import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ================================
// GET CODIGARIO + ITEMS
// ================================

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id } = await context.params
    const parsedId = Number(id)

    if (isNaN(parsedId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    const codigario = await prisma.codigario.findFirst({
      where: {
        id: parsedId,
        institucionId: tenantId,
        deletedAt: null
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" }
        }
      }
    })

    if (!codigario) {
      return new Response(
        JSON.stringify({ error: "No encontrado" }),
        { status: 404 }
      )
    }

    return Response.json(codigario)

  }, req)
}


// ================================
// PATCH
// ================================

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id } = await context.params
    const parsedId = Number(id)

    if (isNaN(parsedId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    const body = await req.json()

    // 🔒 validar existencia + tenant
    const existente = await prisma.codigario.findFirst({
      where: {
        id: parsedId,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!existente) {
      return new Response(
        JSON.stringify({ error: "No encontrado" }),
        { status: 404 }
      )
    }

    try {

      const actualizado = await prisma.codigario.update({
        where: { id: parsedId },
        data: {
          nombre: body.nombre,
          descripcion: body.descripcion
        }
      })

      return Response.json(actualizado)

    } catch (e: any) {

      if (e.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Nombre duplicado" }),
          { status: 409 }
        )
      }

      return new Response(
        JSON.stringify({ error: "Error al actualizar" }),
        { status: 500 }
      )
    }

  }, req)
}


// ================================
// DELETE (soft delete)
// ================================

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id } = await context.params
    const parsedId = Number(id)

    if (isNaN(parsedId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    // 🔒 validar existencia + tenant
    const existente = await prisma.codigario.findFirst({
      where: {
        id: parsedId,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!existente) {
      return new Response(
        JSON.stringify({ error: "No encontrado" }),
        { status: 404 }
      )
    }

    await prisma.codigario.update({
      where: { id: parsedId },
      data: {
        deletedAt: new Date(),
        activo: false
      }
    })

    return Response.json({ ok: true })

  }, req)
}