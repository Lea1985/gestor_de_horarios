// app/api/agentes/[id]/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

const agenteSelect = {
  id:        true,
  nombre:    true,
  apellido:  true,
  documento: true,
  email:     true,
  telefono:  true,
  domicilio: true,
  estado:    true,
  createdAt: true,
  updatedAt: true,
}

// ─── GET /api/agentes/[id] ────────────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const agenteId = Number(id)

  if (isNaN(agenteId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const registro = await prisma.agenteInstitucion.findFirst({
      where: {
        agenteId,
        institucionId: tenantId,
        agente: { activo: true, deletedAt: null },
      },
      include: {
        agente: { select: agenteSelect },
      },
    })

    if (!registro) {
      return Response.json({ error: "Agente no encontrado" }, { status: 404 })
    }

    return Response.json(registro)
  })
}

// ─── PATCH /api/agentes/[id] ──────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const agenteId = Number(id)

  if (isNaN(agenteId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    // Verificar pertenencia al tenant antes de operar
    const registro = await prisma.agenteInstitucion.findFirst({
      where: {
        agenteId,
        institucionId: tenantId,
        agente: { activo: true, deletedAt: null },
      },
    })

    if (!registro) {
      return Response.json({ error: "Agente no encontrado" }, { status: 404 })
    }

    // Whitelist explícita — nunca tocar activo, deletedAt, estado desde acá
    const dataAgente: Prisma.AgenteUpdateInput = {}
    if (body.nombre    !== undefined) dataAgente.nombre    = body.nombre
    if (body.apellido  !== undefined) dataAgente.apellido  = body.apellido
    if (body.email     !== undefined) dataAgente.email     = body.email
    if (body.telefono  !== undefined) dataAgente.telefono  = body.telefono
    if (body.domicilio !== undefined) dataAgente.domicilio = body.domicilio

    if (Object.keys(dataAgente).length === 0 && body.documento === undefined) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const agente = await tx.agente.update({
          where: { id: agenteId },
          data:  dataAgente,
          select: agenteSelect,
        })

        if (body.documento !== undefined) {
          await tx.agenteInstitucion.update({
            where: {
              agenteId_institucionId: { agenteId, institucionId: tenantId },
            },
            data: { documento: body.documento },
          })
          await tx.agente.update({
            where: { id: agenteId },
            data:  { documento: body.documento },
          })
        }

        return agente
      })

      return Response.json(result)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "El documento ya está en uso en esta institución" },
          { status: 409 }
        )
      }

      console.error("Error actualizando agente:", error)
      return Response.json({ error: "Error actualizando agente" }, { status: 500 })
    }
  })
}

// ─── DELETE /api/agentes/[id] ─────────────────────────────────────────────────

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const agenteId = Number(id)

  if (isNaN(agenteId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const registro = await prisma.agenteInstitucion.findFirst({
      where: {
        agenteId,
        institucionId: tenantId,
        agente: { activo: true, deletedAt: null },
      },
    })

    if (!registro) {
      return Response.json({ error: "Agente no encontrado" }, { status: 404 })
    }

    try {
      await prisma.agente.update({
        where: { id: agenteId },
        data: {
          activo:    false,
          deletedAt: new Date(),
        },
      })

      return Response.json({ ok: true })

    } catch (error) {
      console.error("Error eliminando agente:", error)
      return Response.json({ error: "Error eliminando agente" }, { status: 500 })
    }
  })
}