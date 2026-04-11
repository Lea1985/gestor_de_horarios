// app/api/unidades/[id]/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

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

    const unidad = await prisma.unidadOrganizativa.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
        deletedAt:     null,
      },
    })

    if (!unidad) {
      return Response.json({ error: "Unidad no encontrada" }, { status: 404 })
    }

    return Response.json(unidad)
  })
}

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

    const existente = await prisma.unidadOrganizativa.findFirst({
      where: {
        id:            idNum,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!existente) {
      return Response.json({ error: "Unidad no encontrada" }, { status: 404 })
    }

    // Whitelist explícita — nunca permitir cambiar institucionId
    const data: Prisma.UnidadOrganizativaUpdateInput = {}
    if (body.codigoUnidad !== undefined) data.codigoUnidad = body.codigoUnidad
    if (body.nombre       !== undefined) data.nombre       = body.nombre
    if (body.tipo         !== undefined) data.tipo         = body.tipo
    if (body.estado       !== undefined) data.estado       = body.estado

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    try {
      const unidad = await prisma.unidadOrganizativa.update({
        where: { id: idNum },
        data,
      })

      return Response.json(unidad)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe una unidad con ese código en esta institución" },
          { status: 409 }
        )
      }

      console.error("Error actualizando unidad:", error)
      return Response.json({ error: "Error actualizando unidad" }, { status: 500 })
    }
  })
}

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

    const existente = await prisma.unidadOrganizativa.findFirst({
      where:  { id: idNum, institucionId: tenantId },
      select: { id: true, deletedAt: true },
    })

    if (!existente || existente.deletedAt) {
      return Response.json({ ok: true, deleted: false })
    }

    await prisma.unidadOrganizativa.update({
      where: { id: idNum },
      data:  { deletedAt: new Date(), activo: false },
    })

    return Response.json({ ok: true, deleted: true })
  })
}