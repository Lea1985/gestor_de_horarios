// app/api/asignaciones/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const asignaciones = await prisma.asignacion.findMany({
      where: {
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
      orderBy: { createdAt: "desc" },
    })

    return Response.json(asignaciones)
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const {
      agenteId,
      unidadId,
      identificadorEstructural,
      fecha_inicio,
      fecha_fin,
      // Campos opcionales del nuevo schema
      materiaId,
      cursoId,
      comisionId,
      turnoId,
    } = body

    if (!agenteId || !unidadId || !identificadorEstructural || !fecha_inicio) {
      return Response.json(
        { error: "agenteId, unidadId, identificadorEstructural y fecha_inicio son requeridos" },
        { status: 400 }
      )
    }

    // ── Verificar agente pertenece al tenant ─────────────────────────────────
    const agente = await prisma.agente.findFirst({
      where: {
        id:        agenteId,
        deletedAt: null,
        instituciones: {
          some: { institucionId: tenantId },
        },
      },
      select: { id: true },
    })

    if (!agente) {
      return Response.json(
        { error: "Agente no encontrado en esta institución" },
        { status: 404 }
      )
    }

    // ── Verificar unidad pertenece al tenant ─────────────────────────────────
    const unidad = await prisma.unidadOrganizativa.findFirst({
      where: {
        id:            unidadId,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!unidad) {
      return Response.json(
        { error: "Unidad no encontrada en esta institución" },
        { status: 404 }
      )
    }

    // ── Verificar campos opcionales pertenecen al tenant ─────────────────────
    if (materiaId) {
      const materia = await prisma.materia.findFirst({
        where: { id: materiaId, institucionId: tenantId },
        select: { id: true },
      })
      if (!materia) {
        return Response.json(
          { error: "Materia no encontrada en esta institución" },
          { status: 404 }
        )
      }
    }

    if (cursoId) {
      const curso = await prisma.curso.findFirst({
        where: { id: cursoId, institucionId: tenantId },
        select: { id: true },
      })
      if (!curso) {
        return Response.json(
          { error: "Curso no encontrado en esta institución" },
          { status: 404 }
        )
      }
    }

    if (comisionId) {
      const comision = await prisma.comision.findFirst({
        where: { id: comisionId, institucionId: tenantId },
        select: { id: true },
      })
      if (!comision) {
        return Response.json(
          { error: "Comisión no encontrada en esta institución" },
          { status: 404 }
        )
      }
    }

    if (turnoId) {
      const turno = await prisma.turno.findFirst({
        where: { id: turnoId, institucionId: tenantId },
        select: { id: true },
      })
      if (!turno) {
        return Response.json(
          { error: "Turno no encontrado en esta institución" },
          { status: 404 }
        )
      }
    }

    // ── Crear asignación ─────────────────────────────────────────────────────
    try {
      const nueva = await prisma.asignacion.create({
        data: {
          institucionId:           tenantId,
          agenteId,
          unidadId,
          identificadorEstructural,
          fecha_inicio:            new Date(fecha_inicio),
          fecha_fin:               fecha_fin ? new Date(fecha_fin) : null,
          materiaId:               materiaId  ?? null,
          cursoId:                 cursoId    ?? null,
          comisionId:              comisionId ?? null,
          turnoId:                 turnoId    ?? null,
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

      return Response.json(nueva, { status: 201 })

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

      console.error("Error creando asignación:", error)
      return Response.json({ error: "Error creando asignación" }, { status: 500 })
    }
  })
}