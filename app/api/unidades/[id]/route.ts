import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ===== GET unidad por ID =====
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const idNum = Number(params.id)

  return withTenant(async (tenantId) => {
    if (isNaN(idNum)) {
      return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })
    }

    const unidad = await prisma.unidadOrganizativa.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!unidad) {
      return new Response(JSON.stringify({ error: "Unidad no encontrada" }), { status: 404 })
    }

    return Response.json(unidad)

  }, req)
}


// ===== PATCH =====
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const idNum = Number(params.id)

  return withTenant(async (tenantId) => {
    if (isNaN(idNum)) {
      return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 })
    }

    // 🔍 Verificar existencia
    const existente = await prisma.unidadOrganizativa.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!existente) {
      return new Response(JSON.stringify({ error: "Unidad no encontrada" }), { status: 404 })
    }

    try {
      const unidad = await prisma.unidadOrganizativa.update({
        where: { id: idNum },
        data: body
      })

      return Response.json(unidad)

    } catch (error: any) {

      if (error.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Código de unidad duplicado" }),
          { status: 409 }
        )
      }

      throw error
    }

  }, req)
}


// ===== DELETE (soft delete) =====
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const idNum = Number(params.id)

  return withTenant(async (tenantId) => {
    if (isNaN(idNum)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    const existente = await prisma.unidadOrganizativa.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId
      }
    })

    // 🔁 Idempotente: no existe
    if (!existente) {
      return Response.json({
        ok: true,
        deleted: false
      })
    }

    // 🔁 Idempotente: ya eliminado
    if (existente.deletedAt) {
      return Response.json({
        ok: true,
        deleted: false
      })
    }

    // 🧹 Soft delete
    const result = await prisma.unidadOrganizativa.update({
      where: { id: idNum },
      data: {
        deletedAt: new Date(),
        activo: false
      }
    })

    return Response.json({
      ok: true,
      deleted: !!result
    })

  }, req)
}