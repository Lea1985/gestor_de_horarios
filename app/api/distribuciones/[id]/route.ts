import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ===== GET por ID =====
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

    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      },
      include: {
        asignacion: true
      }
    })

    if (!distribucion) {
      return new Response(JSON.stringify({ error: "Distribución no encontrada" }), { status: 404 })
    }

    return Response.json(distribucion)

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

    const existente = await prisma.distribucionHoraria.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!existente) {
      return new Response(JSON.stringify({ error: "Distribución no encontrada" }), { status: 404 })
    }

    try {

      const updated = await prisma.distribucionHoraria.update({
        where: { id: idNum },
        data: {
          ...body,
          fecha_vigencia_desde: body.fecha_vigencia_desde
            ? new Date(body.fecha_vigencia_desde)
            : undefined,
          fecha_vigencia_hasta: body.fecha_vigencia_hasta
            ? new Date(body.fecha_vigencia_hasta)
            : undefined
        }
      })

      return Response.json(updated)

    } catch (error: any) {

      if (error.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Conflicto de versión en distribución" }),
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

    const existente = await prisma.distribucionHoraria.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId
      }
    })

    // idempotente
    if (!existente || existente.deletedAt) {
      return Response.json({
        ok: true,
        deleted: false
      })
    }

    const result = await prisma.distribucionHoraria.update({
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