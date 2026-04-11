// app/api/distribuciones/[id]/route.ts
import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

// ─── GET /api/distribuciones/[id] ────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const idNum = Number(id)

  if (isNaN(idNum)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
console.log(`GET /api/distribuciones/${idNum} - tenantId: ${tenantId} `,await req.clone().text()) // log para debugging
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
        deletedAt:     null,
      },
      include: {
        asignacion: true,
        distribucionModulos: {   // ⚠️ nombre correcto (singular en prisma)
          include: { moduloHorario: true },
        },
      },
    })

    if (!distribucion) {
      return Response.json({ error: "Distribución no encontrada" }, { status: 404 })
    }

    return Response.json(distribucion)
  })
}

// ─── PATCH /api/distribuciones/[id] ──────────────────────────────────────────

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const idNum = Number(id)

  if (isNaN(idNum)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    console.log(`PATCH /api/distribuciones/${idNum} - tenantId: ${tenantId}`, await req.clone().text()) // log para debugging

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const existente = await prisma.distribucionHoraria.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!existente) {
      return Response.json({ error: "Distribución no encontrada" }, { status: 404 })
    }

    const data: Prisma.DistribucionHorariaUpdateInput = {}

    if (body.version !== undefined) data.version = body.version
    if (body.estado !== undefined) data.estado = body.estado

    if (body.fecha_vigencia_desde !== undefined) {
      data.fecha_vigencia_desde = new Date(body.fecha_vigencia_desde)
    }

    if (body.fecha_vigencia_hasta !== undefined) {
      data.fecha_vigencia_hasta = body.fecha_vigencia_hasta
        ? new Date(body.fecha_vigencia_hasta)
        : null
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    try {
      const updated = await prisma.distribucionHoraria.update({
        where: { id: idNum },
        data,
      })

      return Response.json(updated)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Conflicto de versión en esta asignación" },
          { status: 409 }
        )
      }

      console.error("Error actualizando distribución:", error)
      return Response.json({ error: "Error actualizando distribución" }, { status: 500 })
    }
  })
}

// ─── DELETE /api/distribuciones/[id] ─────────────────────────────────────────

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const idNum = Number(id)

  if (isNaN(idNum)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    console.log(`DELETE /api/distribuciones/${idNum} - tenantId: ${tenantId}`, await req.clone().text()) // log para debugging

    const existente = await prisma.distribucionHoraria.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
      },
      select: { id: true, deletedAt: true },
    })

    // ✅ idempotente (como esperan los tests)
    if (!existente) {
      return Response.json({ ok: true, deleted: false })
    }

    if (existente.deletedAt) {
      return Response.json({ ok: true, deleted: false })
    }

    await prisma.distribucionHoraria.update({
      where: { id: idNum },
      data: {
        deletedAt: new Date(),
        activo:    false,
      },
    })

    return Response.json({ ok: true, deleted: true })
  })
}