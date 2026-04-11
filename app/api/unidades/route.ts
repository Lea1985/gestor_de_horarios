// app/api/unidades/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const unidades = await prisma.unidadOrganizativa.findMany({
      where: {
        institucionId: tenantId,
        deletedAt:     null,
      },
      orderBy: { codigoUnidad: "asc" },
    })

    return Response.json(unidades)
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

    const { codigoUnidad, nombre, tipo } = body

    if (codigoUnidad == null || !nombre) {
      return Response.json(
        { error: "codigoUnidad y nombre son obligatorios" },
        { status: 400 }
      )
    }

    try {
      const nueva = await prisma.unidadOrganizativa.create({
        data: {
          institucionId: tenantId,
          codigoUnidad,
          nombre,
          tipo: tipo ?? null,
        },
      })

      return Response.json(nueva, { status: 201 })

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

      console.error("Error creando unidad:", error)
      return Response.json({ error: "Error creando unidad" }, { status: 500 })
    }
  })
}