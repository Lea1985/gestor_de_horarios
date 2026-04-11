// app/api/incidencias/validar-superposicion/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const {
      asignacionId,
      fecha_desde,
      fecha_hasta,
      codigarioItemId,
      incidenciaPadreId,
      observacion,
    } = body

    if (!asignacionId || !fecha_desde || !fecha_hasta || !codigarioItemId) {
      return Response.json(
        { error: "asignacionId, fecha_desde, fecha_hasta y codigarioItemId son requeridos" },
        { status: 400 }
      )
    }

    const fechaDesde = new Date(fecha_desde)
    const fechaHasta = new Date(fecha_hasta)

    if (fechaDesde > fechaHasta) {
      return Response.json(
        { error: "fecha_desde no puede ser mayor a fecha_hasta" },
        { status: 400 }
      )
    }

    // ── Validar asignación pertenece al tenant y está activa ─────────────────
    const asignacion = await prisma.asignacion.findFirst({
      where: {
        id:            asignacionId,
        institucionId: tenantId,
        activo:        true,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!asignacion) {
      return Response.json(
        { error: "Asignación no encontrada o inactiva" },
        { status: 404 }
      )
    }

    // ── Validar codigarioItem pertenece al tenant ────────────────────────────
    // Antes faltaba esta validación — un cliente podía usar un itemId
    // de otra institución.
    const item = await prisma.codigarioItem.findFirst({
      where: {
        id:     codigarioItemId,
        activo: true,
        codigario: {
          institucionId: tenantId,
        },
      },
      select: { id: true },
    })

    if (!item) {
      return Response.json(
        { error: "Código de incidencia no válido para esta institución" },
        { status: 400 }
      )
    }

    // ── Validar incidencia padre (si viene) ──────────────────────────────────
    if (incidenciaPadreId) {
      const padre = await prisma.incidencia.findFirst({
        where: {
          id:          incidenciaPadreId,
          asignacionId,
          deletedAt:   null,
        },
        select: { id: true },
      })

      if (!padre) {
        return Response.json(
          { error: "Incidencia padre no válida" },
          { status: 400 }
        )
      }
    }

    // ── Validar superposición ────────────────────────────────────────────────
    const conflicto = await prisma.incidencia.findFirst({
      where: {
        asignacionId,
        codigarioItemId,
        activo:    true,
        deletedAt: null,
        AND: [
          { fecha_desde: { lte: fechaHasta } },
          { fecha_hasta: { gte: fechaDesde } },
        ],
      },
      select: { id: true, fecha_desde: true, fecha_hasta: true },
    })

    if (conflicto) {
      return Response.json(
        {
          error:     "Ya existe una incidencia de ese tipo en el rango de fechas indicado",
          conflicto: {
            id:          conflicto.id,
            fecha_desde: conflicto.fecha_desde,
            fecha_hasta: conflicto.fecha_hasta,
          },
        },
        { status: 409 }
      )
    }

    // ── Crear incidencia ─────────────────────────────────────────────────────
    const nueva = await prisma.incidencia.create({
      data: {
        asignacionId,
        fecha_desde:       fechaDesde,
        fecha_hasta:       fechaHasta,
        codigarioItemId,
        incidenciaPadreId: incidenciaPadreId ?? null,
        observacion,
      },
      include: {
        codigarioItem: true,
        padre:         true,
      },
    })

    return Response.json(nueva, { status: 201 })
  })
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)
    const asignacionId = searchParams.get("asignacionId")

    const incidencias = await prisma.incidencia.findMany({
      where: {
        activo:    true,
        deletedAt: null,
        asignacion: {
          institucionId: tenantId,
          // Si viene filtro por asignación, lo aplicamos directamente
          ...(asignacionId ? { id: Number(asignacionId) } : {}),
        },
      },
      include: {
        padre:        true,
        hijos:        true,
        codigarioItem: true,
      },
      orderBy: { fecha_desde: "desc" },
    })

    return Response.json(incidencias)
  })
}