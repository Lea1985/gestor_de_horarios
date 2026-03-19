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

    const actualizada = await prisma.unidadOrganizativa.updateMany({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      },
      data: body
    })

    if (actualizada.count === 0) {
      return new Response(JSON.stringify({ error: "Unidad no encontrada" }), { status: 404 })
    }

    const unidad = await prisma.unidadOrganizativa.findFirst({
      where: { id: idNum, institucionId: tenantId }
    })

    return Response.json(unidad)

  }, req)
}


// ===== DELETE =====
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

    // 🔁 No existe → idempotente
    if (!existente) {
      return Response.json({
        ok: true,
        deleted: false
      })
    }

    // 🔁 Ya estaba borrado → idempotente
    if (existente.deletedAt) {
      return Response.json({
        ok: true,
        deleted: false
      })
    }

    // 🧹 Soft delete real
    const result = await prisma.unidadOrganizativa.updateMany({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date(),
        activo: false
      }
    })

    return Response.json({
      ok: true,
      deleted: result.count > 0
    })

  }, req)
}