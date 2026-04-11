// app/api/asignaciones/[id]/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

// ─── GET /api/asignaciones/[id] ───────────────────────────────────────────────

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

    const asignacion = await prisma.asignacion.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
        deletedAt:     null,
      },
      include: {
        agente:   true,
        unidad:   true,
        materia:  true,
        curso:    true,
        comision: true,
        turno:    true,
      },
    })

    if (!asignacion) {
      return Response.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    return Response.json(asignacion)
  })
}

// ─── PATCH /api/asignaciones/[id] ────────────────────────────────────────────

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

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    // Verificar existencia y pertenencia al tenant
    const existente = await prisma.asignacion.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!existente) {
      return Response.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Whitelist explícita — nunca permitir cambiar institucionId desde acá
    const data: Prisma.AsignacionUpdateInput = {}

    if (body.identificadorEstructural !== undefined) data.identificadorEstructural = body.identificadorEstructural
    if (body.fecha_inicio             !== undefined) data.fecha_inicio             = new Date(body.fecha_inicio)
    if (body.fecha_fin                !== undefined) data.fecha_fin                = body.fecha_fin ? new Date(body.fecha_fin) : null
    if (body.estado                   !== undefined) data.estado                   = body.estado

    // Campos opcionales del schema
    if (body.materiaId  !== undefined) data.materia  = body.materiaId  ? { connect: { id: body.materiaId  } } : { disconnect: true }
    if (body.cursoId    !== undefined) data.curso    = body.cursoId    ? { connect: { id: body.cursoId    } } : { disconnect: true }
    if (body.comisionId !== undefined) data.comision = body.comisionId ? { connect: { id: body.comisionId } } : { disconnect: true }
    if (body.turnoId    !== undefined) data.turno    = body.turnoId    ? { connect: { id: body.turnoId    } } : { disconnect: true }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    try {
      const actualizada = await prisma.asignacion.update({
        where: { id: idNum },
        data,
        include: {
          agente:   true,
          unidad:   true,
          materia:  true,
          curso:    true,
          comision: true,
          turno:    true,
        },
      })

      return Response.json(actualizada)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "El identificador estructural ya existe en esta institución" },
          { status: 409 }
        )
      }

      console.error("Error actualizando asignación:", error)
      return Response.json({ error: "Error actualizando asignación" }, { status: 500 })
    }
  })
}

// ─── DELETE /api/asignaciones/[id] ───────────────────────────────────────────

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

    const existente = await prisma.asignacion.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
      },
      select: { id: true, deletedAt: true },
    })

    // Si no existe o ya fue eliminada → idempotente, no es un error
    if (!existente || existente.deletedAt) {
      return Response.json({ ok: true, deleted: false })
    }

    await prisma.asignacion.update({
      where: { id: idNum },
      data: {
        deletedAt: new Date(),
        activo:    false,
      },
    })

    return Response.json({ ok: true, deleted: true })
  })
}