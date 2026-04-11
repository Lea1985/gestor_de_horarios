// app/api/modulosHorarios/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma, Dias } from "@prisma/client"

async function haySolapamiento(
  tenantId: number,
  dia_semana: Dias,
  hora_desde: number,
  hora_hasta: number,
  excludeId?: number
): Promise<boolean> {
  const where: Prisma.ModuloHorarioWhereInput = {
    institucionId: tenantId,
    dia_semana,
    deletedAt:     null,
    AND: [
      { hora_desde: { lt: hora_hasta } },
      { hora_hasta: { gt: hora_desde } },
    ],
  }

  if (excludeId) where.id = { not: excludeId }

  const count = await prisma.moduloHorario.count({ where })
  return count > 0
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const modulos = await prisma.moduloHorario.findMany({
      where: {
        institucionId: tenantId,
        deletedAt:     null,
      },
      orderBy: [
        { dia_semana: "asc" },
        { hora_desde: "asc" },
      ],
    })

    return Response.json(modulos)
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

    const { dia_semana, hora_desde, hora_hasta, turnoId } = body

    if (!dia_semana || hora_desde == null || hora_hasta == null) {
      return Response.json(
        { error: "dia_semana, hora_desde y hora_hasta son obligatorios" },
        { status: 400 }
      )
    }

    if (hora_desde >= hora_hasta) {
      return Response.json(
        { error: "hora_desde debe ser menor que hora_hasta" },
        { status: 400 }
      )
    }

    if (await haySolapamiento(tenantId, dia_semana, hora_desde, hora_hasta)) {
      return Response.json(
        { error: "Horario solapado con otro módulo existente" },
        { status: 409 }
      )
    }

    try {
      const nuevo = await prisma.moduloHorario.create({
        data: {
          institucionId: tenantId,
          dia_semana,
          hora_desde,
          hora_hasta,
          turnoId:       turnoId ?? null,
          activo:        true,
        },
      })

      return Response.json(nuevo, { status: 201 })

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existente = await prisma.moduloHorario.findFirst({
          where: { institucionId: tenantId, dia_semana, hora_desde, hora_hasta },
        })
        return Response.json(
          { error: "Ya existe un módulo con esos datos", modulo: existente },
          { status: 409 }
        )
      }

      console.error("Error creando módulo:", error)
      return Response.json({ error: "Error creando módulo" }, { status: 500 })
    }
  })
}