import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

function parseId(id: string) {
  const [distribucionHorariaId, moduloHorarioId] = id.split("-").map(Number)

  if (isNaN(distribucionHorariaId) || isNaN(moduloHorarioId)) {
    return null
  }

  return { distribucionHorariaId, moduloHorarioId }
}


// ===== GET =====
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const parsed = parseId(params.id)

  return withTenant(async (tenantId) => {

    if (!parsed) {
      return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })
    }

    const item = await prisma.distribucionModulo.findFirst({
      where: {
        distribucionHorariaId: parsed.distribucionHorariaId,
        moduloHorarioId: parsed.moduloHorarioId,
        distribucionHoraria: {
          institucionId: tenantId,
          deletedAt: null,
          activo: true
        }
      },
      include: {
        moduloHorario: true
      }
    })

    if (!item) {
      return new Response(JSON.stringify({ error: "No encontrado" }), { status: 404 })
    }

    return Response.json(item)

  }, req)
}


// ===== DELETE =====
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const parsed = parseId(params.id)

  return withTenant(async (tenantId) => {

    if (!parsed) {
      return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })
    }

    // 🔒 Validar pertenencia al tenant
    const existente = await prisma.distribucionModulo.findFirst({
      where: {
        distribucionHorariaId: parsed.distribucionHorariaId,
        moduloHorarioId: parsed.moduloHorarioId,
        distribucionHoraria: {
          institucionId: tenantId
        }
      }
    })

    // idempotente
    if (!existente) {
      return Response.json({ ok: true, deleted: false })
    }

    await prisma.distribucionModulo.delete({
      where: {
        distribucionHorariaId_moduloHorarioId: {
          distribucionHorariaId: parsed.distribucionHorariaId,
          moduloHorarioId: parsed.moduloHorarioId
        }
      }
    })

    return Response.json({ ok: true, deleted: true })

  }, req)
}