import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ================================
// GET
// ================================

export async function GET(
  req: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  return withTenant(async (tenantId) => {

    const { itemId } = await context.params
    const parsedId = Number(itemId)

    if (isNaN(parsedId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    const item = await prisma.codigarioItem.findFirst({
      where: {
        id: parsedId,
        deletedAt: null,
        codigario: {
          institucionId: tenantId
        }
      }
    })

    if (!item) {
      return new Response(
        JSON.stringify({ error: "No encontrado" }),
        { status: 404 }
      )
    }

    return Response.json(item)

  }, req)
}

// ================================
// PATCH
// ================================

export async function PATCH(
  req: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  return withTenant(async (tenantId) => {

    const { itemId } = await context.params
    const parsedId = Number(itemId)

    if (isNaN(parsedId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    const body = await req.json()

    try {

      // 🔒 validación multi-tenant
      const existente = await prisma.codigarioItem.findFirst({
        where: {
          id: parsedId,
          codigario: {
            institucionId: tenantId
          }
        }
      })

      if (!existente) {
        return new Response(
          JSON.stringify({ error: "No encontrado" }),
          { status: 404 }
        )
      }

      const actualizado = await prisma.codigarioItem.update({
        where: { id: parsedId },
        data: {
          codigo: body.codigo,
          nombre: body.nombre,
          descripcion: body.descripcion
        }
      })

      return Response.json(actualizado)

    } catch (e: any) {

      if (e.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Código duplicado" }),
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
  context: { params: Promise<{ itemId: string }> }
) {
  return withTenant(async (tenantId) => {

    const { itemId } = await context.params
    const parsedId = Number(itemId)

    if (isNaN(parsedId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    // 🔒 validación multi-tenant
    const existente = await prisma.codigarioItem.findFirst({
      where: {
        id: parsedId,
        codigario: {
          institucionId: tenantId
        }
      }
    })

    if (!existente) {
      return new Response(
        JSON.stringify({ error: "No encontrado" }),
        { status: 404 }
      )
    }

    await prisma.codigarioItem.update({
      where: { id: parsedId },
      data: {
        deletedAt: new Date(),
        activo: false
      }
    })

    return Response.json({ ok: true })

  }, req)
}