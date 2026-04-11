// app/api/modulosHorarios/[id]/route.ts

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

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const moduloId = Number(id)

  if (isNaN(moduloId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const modulo = await prisma.moduloHorario.findFirst({
      where: { id: moduloId, institucionId: tenantId, deletedAt: null },
    })

    if (!modulo) {
      return Response.json({ error: "Módulo no encontrado" }, { status: 404 })
    }

    return Response.json(modulo)
  })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const moduloId = Number(id)

  if (isNaN(moduloId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const modulo = await prisma.moduloHorario.findFirst({
      where: { id: moduloId, institucionId: tenantId, deletedAt: null },
    })

    if (!modulo) {
      return Response.json({ error: "Módulo no encontrado" }, { status: 404 })
    }

    const nuevoDia    = body.dia_semana ?? modulo.dia_semana
    const nuevoDesde  = body.hora_desde ?? modulo.hora_desde
    const nuevoHasta  = body.hora_hasta ?? modulo.hora_hasta

    if (nuevoDesde >= nuevoHasta) {
      return Response.json(
        { error: "hora_desde debe ser menor que hora_hasta" },
        { status: 400 }
      )
    }

    if (await haySolapamiento(tenantId, nuevoDia, nuevoDesde, nuevoHasta, moduloId)) {
      return Response.json(
        { error: "Horario solapado con otro módulo existente" },
        { status: 409 }
      )
    }

    const data: Prisma.ModuloHorarioUpdateInput = {
      dia_semana: nuevoDia,
      hora_desde: nuevoDesde,
      hora_hasta: nuevoHasta,
      activo:     body.activo ?? modulo.activo,
    }

    if (body.turnoId !== undefined) {
      data.turno = body.turnoId ? { connect: { id: body.turnoId } } : { disconnect: true }
    }

    try {
      const actualizado = await prisma.moduloHorario.update({
        where: { id: moduloId },
        data,
      })

      return Response.json(actualizado)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe un módulo con esos datos" },
          { status: 409 }
        )
      }

      console.error("Error actualizando módulo:", error)
      return Response.json({ error: "Error actualizando módulo" }, { status: 500 })
    }
  })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const moduloId = Number(id)

  if (isNaN(moduloId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const modulo = await prisma.moduloHorario.findFirst({
      where:  { id: moduloId, institucionId: tenantId },
      select: { id: true, deletedAt: true },
    })

    if (!modulo || modulo.deletedAt) {
      return Response.json({ ok: true, deleted: false })
    }

    await prisma.moduloHorario.update({
      where: { id: moduloId },
      data:  { deletedAt: new Date(), activo: false },
    })

    return Response.json({ ok: true, deleted: true })
  })
}