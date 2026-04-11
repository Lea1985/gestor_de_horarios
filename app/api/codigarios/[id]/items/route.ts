// app/api/codigarios/[id]/items/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const codigarioId = Number(id)

  if (isNaN(codigarioId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const items = await prisma.codigarioItem.findMany({
      where: {
        codigarioId,
        deletedAt: null,
        codigario: { institucionId: tenantId },
      },
      orderBy: { createdAt: "asc" },
    })

    return Response.json(items)
  })
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const codigarioId = Number(id)

  if (isNaN(codigarioId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    if (!body.codigo || !body.nombre) {
      return Response.json(
        { error: "codigo y nombre son obligatorios" },
        { status: 400 }
      )
    }

    // Validar que el codigario pertenece al tenant
    const codigario = await prisma.codigario.findFirst({
      where: {
        id:            codigarioId,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!codigario) {
      return Response.json({ error: "Codigario no encontrado" }, { status: 404 })
    }

    try {
      const nuevo = await prisma.codigarioItem.create({
        data: {
          codigo:      body.codigo,
          nombre:      body.nombre,
          descripcion: body.descripcion,
          codigarioId,
        },
      })

      return Response.json(nuevo, { status: 201 })

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

      console.error("Error creando item:", error)
      return Response.json({ error: "Error creando item" }, { status: 500 })
    }
  })
}