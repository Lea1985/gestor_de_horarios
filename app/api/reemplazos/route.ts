// app/api/reemplazos/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body: {
      claseId:              number
      asignacionTitularId:  number
      asignacionSuplenteId: number
      observacion?:         string
    }

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { claseId, asignacionTitularId, asignacionSuplenteId, observacion } = body

    if (!claseId || !asignacionTitularId || !asignacionSuplenteId) {
      return Response.json(
        { error: "claseId, asignacionTitularId y asignacionSuplenteId son obligatorios" },
        { status: 400 }
      )
    }

    if (asignacionTitularId === asignacionSuplenteId) {
      return Response.json(
        { error: "La asignación titular y suplente no pueden ser la misma" },
        { status: 400 }
      )
    }

    // Validar clase pertenece al tenant
    const clase = await prisma.claseProgramada.findFirst({
      where:  { id: claseId, institucionId: tenantId },
      select: { id: true },
    })

    if (!clase) {
      return Response.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    // Validar asignaciones pertenecen al tenant
    const [titular, suplente] = await Promise.all([
      prisma.asignacion.findFirst({
        where:  { id: asignacionTitularId, institucionId: tenantId },
        select: { id: true },
      }),
      prisma.asignacion.findFirst({
        where:  { id: asignacionSuplenteId, institucionId: tenantId },
        select: { id: true },
      }),
    ])

    if (!titular) {
      return Response.json({ error: "Asignación titular no encontrada" }, { status: 404 })
    }

    if (!suplente) {
      return Response.json({ error: "Asignación suplente no encontrada" }, { status: 404 })
    }

    // Verificar que no exista ya un reemplazo activo para esta clase
    const reemplazoExistente = await prisma.reemplazo.findFirst({
      where:  { claseId, activo: true },
      select: { id: true },
    })

    if (reemplazoExistente) {
      return Response.json(
        { error: "Ya existe un reemplazo activo para esta clase" },
        { status: 409 }
      )
    }

    // Crear reemplazo y actualizar estado de la clase en una transacción
    const [reemplazo] = await prisma.$transaction([
      prisma.reemplazo.create({
        data: {
          claseId,
          asignacionTitularId,
          asignacionSuplenteId,
          observacion,
          activo: true,
        },
      }),
      prisma.claseProgramada.update({
        where: { id: claseId },
        data:  { estado: "REEMPLAZADA" },
      }),
    ])

    return Response.json(reemplazo, { status: 201 })
  })
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)

    const claseId              = searchParams.get("claseId")
    const asignacionTitularId  = searchParams.get("asignacionTitularId")
    const asignacionSuplenteId = searchParams.get("asignacionSuplenteId")
    const fecha_desde          = searchParams.get("fecha_desde")
    const fecha_hasta          = searchParams.get("fecha_hasta")

    if (!claseId && !asignacionTitularId && !asignacionSuplenteId && !fecha_desde) {
      return Response.json(
        { error: "Se requiere al menos uno de: claseId, asignacionTitularId, asignacionSuplenteId, fecha_desde" },
        { status: 400 }
      )
    }

    const where: Prisma.ReemplazoWhereInput = {
      activo: true,
      clase:  { institucionId: tenantId },
    }

    if (claseId)              where.claseId              = parseInt(claseId)
    if (asignacionTitularId)  where.asignacionTitularId  = parseInt(asignacionTitularId)
    if (asignacionSuplenteId) where.asignacionSuplenteId = parseInt(asignacionSuplenteId)

    if (fecha_desde || fecha_hasta) {
      where.clase = {
        institucionId: tenantId,
        fecha:         {
          ...(fecha_desde ? { gte: new Date(fecha_desde) } : {}),
          ...(fecha_hasta ? { lte: new Date(fecha_hasta) } : {}),
        },
      }
    }

    const reemplazos = await prisma.reemplazo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        clase: {
          select: {
            fecha:  true,
            estado: true,
            modulo: { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
            unidad: { select: { nombre: true } },
          },
        },
        asignacionTitular:  { select: { identificadorEstructural: true, agenteId: true } },
        asignacionSuplente: { select: { identificadorEstructural: true, agenteId: true } },
      },
    })

    return Response.json(reemplazos)
  })
}