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

    const asignacion = await prisma.asignacion.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      },
      include: {
        agente: true,
        unidad: true
      }
    })

    if (!asignacion) {
      return new Response(JSON.stringify({ error: "Asignación no encontrada" }), { status: 404 })
    }

    return Response.json(asignacion)

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

    const existente = await prisma.asignacion.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId,
        deletedAt: null
      }
    })

    if (!existente) {
      return new Response(JSON.stringify({ error: "Asignación no encontrada" }), { status: 404 })
    }

    try {
      const actualizada = await prisma.asignacion.update({
        where: { id: idNum },
        data: {
          ...body,
          fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : undefined,
          fecha_fin: body.fecha_fin ? new Date(body.fecha_fin) : undefined
        }
      })

      return Response.json(actualizada)

    } catch (error: any) {

      if (error.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Conflicto de datos únicos" }),
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
      return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })
    }

    const existente = await prisma.asignacion.findFirst({
      where: {
        id: idNum,
        institucionId: tenantId
      }
    })

    if (!existente || existente.deletedAt) {
      return Response.json({ ok: true, deleted: false })
    }

    const result = await prisma.asignacion.update({
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