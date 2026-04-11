// app/api/codigarios/[id]/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const parsedId = Number(id)

  if (isNaN(parsedId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const codigario = await prisma.codigario.findFirst({
      where: {
        id:            parsedId,
        institucionId: tenantId,
        deletedAt:     null,
      },
      include: {
        items: {
          where:   { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!codigario) {
      return Response.json({ error: "Codigario no encontrado" }, { status: 404 })
    }

    return Response.json(codigario)
  })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const parsedId = Number(id)

  if (isNaN(parsedId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const existente = await prisma.codigario.findFirst({
      where: {
        id:            parsedId,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!existente) {
      return Response.json({ error: "Codigario no encontrado" }, { status: 404 })
    }

    const data: Prisma.CodigarioUpdateInput = {}
    if (body.nombre      !== undefined) data.nombre      = body.nombre.trim().toUpperCase()
    if (body.descripcion !== undefined) data.descripcion = body.descripcion

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    try {
      const actualizado = await prisma.codigario.update({
        where: { id: parsedId },
        data,
      })

      return Response.json(actualizado)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json({ error: "Ya existe un codigario con ese nombre" }, { status: 409 })
      }

      console.error("Error actualizando codigario:", error)
      return Response.json({ error: "Error actualizando codigario" }, { status: 500 })
    }
  })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const parsedId = Number(id)

  if (isNaN(parsedId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const existente = await prisma.codigario.findFirst({
      where: {
        id:            parsedId,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!existente) {
      return Response.json({ error: "Codigario no encontrado" }, { status: 404 })
    }

    await prisma.codigario.update({
      where: { id: parsedId },
      data: {
        deletedAt: new Date(),
        activo:    false,
      },
    })

    return Response.json({ ok: true })
  })
}