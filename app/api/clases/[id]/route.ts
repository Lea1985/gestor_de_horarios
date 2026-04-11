// app/api/clases/[id]/route.ts

import { withContext } from "@/lib/auth/withContext"
import { EstadoClase } from "@prisma/client"
import prisma from "@/lib/prisma"

const ESTADOS_VALIDOS = Object.values(EstadoClase)

// ─── GET /api/clases/[id] ─────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  const id = parseInt(idParam)

  if (isNaN(id)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const clase = await prisma.claseProgramada.findFirst({
      where: { id, institucionId: tenantId },
      include: {
        modulo:   true,
        unidad:   true,
        comision: true, // nuevo campo del schema
        asignacion: {
          include: {
            agente: {
              select: { nombre: true, apellido: true, documento: true },
            },
          },
        },
        incidencia: {
          include: {
            codigarioItem: {
              select: { codigo: true, nombre: true },
            },
          },
        },
        reemplazos: {
          include: {
            asignacionTitular:  { select: { identificadorEstructural: true } },
            asignacionSuplente: { select: { identificadorEstructural: true } },
          },
        },
      },
    })

    if (!clase) {
      return Response.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    return Response.json(clase)
  })
}

// ─── PATCH /api/clases/[id] ───────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  const id = parseInt(idParam)

  if (isNaN(id)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    let body: {
      estado?:       string
      incidenciaId?: number | null
    }

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { estado, incidenciaId } = body

    if (estado === undefined && incidenciaId === undefined) {
      return Response.json(
        { error: "Se requiere al menos: estado o incidenciaId" },
        { status: 400 }
      )
    }

    // Usar el enum de Prisma para validar — no un array hardcodeado
    if (estado && !ESTADOS_VALIDOS.includes(estado as EstadoClase)) {
      return Response.json(
        { error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      )
    }

    const existente = await prisma.claseProgramada.findFirst({
      where:  { id, institucionId: tenantId },
      select: { id: true, asignacionId: true },
    })

    if (!existente) {
      return Response.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    if (incidenciaId) {
      const incidencia = await prisma.incidencia.findFirst({
        where: {
          id:          incidenciaId,
          asignacionId: existente.asignacionId,
          deletedAt:   null,
        },
        select: { id: true },
      })

      if (!incidencia) {
        return Response.json(
          { error: "Incidencia no encontrada o no pertenece a la asignación de esta clase" },
          { status: 400 }
        )
      }
    }

    const data: Partial<{ estado: EstadoClase; incidenciaId: number | null }> = {}
    if (estado       !== undefined) data.estado       = estado as EstadoClase
    if (incidenciaId !== undefined) data.incidenciaId = incidenciaId

    const actualizada = await prisma.claseProgramada.update({
      where: { id },
      data,
    })

    return Response.json(actualizada)
  })
}