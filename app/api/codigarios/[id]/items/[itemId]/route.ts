// app/api/codigarios/[id]/items/[itemId]/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await context.params
  const parsedId = Number(itemId)

  if (isNaN(parsedId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const item = await prisma.codigarioItem.findFirst({
      where: {
        id:        parsedId,
        deletedAt: null,
        codigario: { institucionId: tenantId },
      },
    })

    if (!item) {
      return Response.json({ error: "Item no encontrado" }, { status: 404 })
    }

    return Response.json(item)
  })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await context.params
  const parsedId = Number(itemId)

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

    const existente = await prisma.codigarioItem.findFirst({
      where: {
        id:        parsedId,
        deletedAt: null,
        codigario: { institucionId: tenantId },
      },
      select: { id: true },
    })

    if (!existente) {
      return Response.json({ error: "Item no encontrado" }, { status: 404 })
    }

    const data: Prisma.CodigarioItemUpdateInput = {}
    if (body.codigo      !== undefined) data.codigo      = body.codigo
    if (body.nombre      !== undefined) data.nombre      = body.nombre
    if (body.descripcion !== undefined) data.descripcion = body.descripcion

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    try {
      const actualizado = await prisma.codigarioItem.update({
        where: { id: parsedId },
        data,
      })

      return Response.json(actualizado)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe un item con ese código en este codigario" },
          { status: 409 }
        )
      }

      console.error("Error actualizando item:", error)
      return Response.json({ error: "Error actualizando item" }, { status: 500 })
    }
  })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await context.params
  const parsedId = Number(itemId)

  if (isNaN(parsedId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const existente = await prisma.codigarioItem.findFirst({
      where: {
        id:        parsedId,
        codigario: { institucionId: tenantId },
      },
      select: { id: true, deletedAt: true },
    })

    if (!existente || existente.deletedAt) {
      return Response.json({ ok: true, deleted: false })
    }

    await prisma.codigarioItem.update({
      where: { id: parsedId },
      data: {
        deletedAt: new Date(),
        activo:    false,
      },
    })

    return Response.json({ ok: true, deleted: true })
  })
}