// app/api/incidencias/[id]/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"

// ─── GET /api/incidencias/[id] ────────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const incidenciaId = Number(id)

  if (!incidenciaId || isNaN(incidenciaId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const item = await prisma.incidencia.findFirst({
      where: {
        id:        incidenciaId,
        deletedAt: null,
        asignacion: { institucionId: tenantId },
      },
      include: {
        codigarioItem: true,
        padre:         true,
        hijos:         true,
      },
    })

    if (!item) {
      return Response.json({ error: "Incidencia no encontrada" }, { status: 404 })
    }

    return Response.json(item)
  })
}

// ─── PATCH /api/incidencias/[id] ──────────────────────────────────────────────

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const incidenciaId = Number(id)

  if (!incidenciaId || isNaN(incidenciaId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { fecha_desde, fecha_hasta, codigarioItemId, observacion } = body

    const incidencia = await prisma.incidencia.findFirst({
      where: {
        id:        incidenciaId,
        deletedAt: null,
        asignacion: { institucionId: tenantId },
      },
    })

    if (!incidencia) {
      return Response.json({ error: "Incidencia no encontrada" }, { status: 404 })
    }

    const nuevaDesde = fecha_desde ? new Date(fecha_desde) : incidencia.fecha_desde
    const nuevaHasta = fecha_hasta ? new Date(fecha_hasta) : incidencia.fecha_hasta

    if (nuevaDesde > nuevaHasta) {
      return Response.json({ error: "Rango de fechas inválido" }, { status: 400 })
    }

    // Validar superposición excluyendo la incidencia actual
    const conflicto = await prisma.incidencia.findFirst({
      where: {
        asignacionId:    incidencia.asignacionId,
        codigarioItemId: codigarioItemId ?? incidencia.codigarioItemId,
        id:              { not: incidenciaId },
        activo:          true,
        deletedAt:       null,
        AND: [
          { fecha_desde: { lte: nuevaHasta } },
          { fecha_hasta: { gte: nuevaDesde } },
        ],
      },
      select: { id: true, fecha_desde: true, fecha_hasta: true },
    })

    if (conflicto) {
      return Response.json(
        {
          error:     "Conflicto de fechas con otra incidencia",
          conflicto: {
            id:          conflicto.id,
            fecha_desde: conflicto.fecha_desde,
            fecha_hasta: conflicto.fecha_hasta,
          },
        },
        { status: 409 }
      )
    }

    // Validar que el codigarioItem pertenece al tenant si se está cambiando
    if (codigarioItemId && codigarioItemId !== incidencia.codigarioItemId) {
      const item = await prisma.codigarioItem.findFirst({
        where: {
          id:     codigarioItemId,
          activo: true,
          codigario: { institucionId: tenantId },
        },
        select: { id: true },
      })

      if (!item) {
        return Response.json(
          { error: "Código de incidencia no válido para esta institución" },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.incidencia.update({
      where: { id: incidenciaId },
      data: {
        fecha_desde:     nuevaDesde,
        fecha_hasta:     nuevaHasta,
        codigarioItemId: codigarioItemId ?? incidencia.codigarioItemId,
        observacion,
      },
      include: {
        codigarioItem: true,
        padre:         true,
        hijos:         true,
      },
    })

    return Response.json(updated)
  })
}

// ─── DELETE /api/incidencias/[id] ─────────────────────────────────────────────

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const incidenciaId = Number(id)

  if (!incidenciaId || isNaN(incidenciaId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const incidencia = await prisma.incidencia.findFirst({
      where: {
        id: incidenciaId,
        asignacion: { institucionId: tenantId },
      },
      select: { id: true, deletedAt: true },
    })

    if (!incidencia || incidencia.deletedAt) {
      return Response.json({ ok: true, deleted: false })
    }

    await prisma.incidencia.update({
      where: { id: incidenciaId },
      data: {
        activo:    false,
        deletedAt: new Date(),
      },
    })

    return Response.json({ ok: true, deleted: true })
  })
}