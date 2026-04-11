// app/api/codigarios/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const codigarios = await prisma.codigario.findMany({
      where: {
        institucionId: tenantId,
        deletedAt:     null,
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(codigarios)
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

    if (!body.nombre) {
      return Response.json({ error: "nombre es obligatorio" }, { status: 400 })
    }

    const nombre = body.nombre.trim().toUpperCase()

    try {
      const nuevo = await prisma.codigario.create({
        data: {
          nombre,
          descripcion:   body.descripcion,
          institucionId: tenantId,
        },
      })

      return Response.json(nuevo, { status: 201 })

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json({ error: "Ya existe un codigario con ese nombre" }, { status: 409 })
      }

      console.error("Error creando codigario:", error)
      return Response.json({ error: "Error creando codigario" }, { status: 500 })
    }
  })
}