// app/api/reportes/agente/[id]/route.ts

import { withContext } from "@/lib/auth/withContext"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  const agenteId = parseInt(idParam)

  if (isNaN(agenteId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)
    const fecha_desde = searchParams.get("fecha_desde")
    const fecha_hasta = searchParams.get("fecha_hasta")

    if (!fecha_desde || !fecha_hasta) {
      return Response.json(
        { error: "fecha_desde y fecha_hasta son obligatorios" },
        { status: 400 }
      )
    }

    const agente = await prisma.agenteInstitucion.findFirst({
      where: { agenteId, institucionId: tenantId },
      include: {
        agente: { select: { nombre: true, apellido: true, documento: true, email: true } },
      },
    })

    if (!agente) {
      return Response.json({ error: "Agente no encontrado" }, { status: 404 })
    }

    const rango = {
      gte: new Date(fecha_desde),
      lte: new Date(fecha_hasta),
    }

    const asignaciones = await prisma.asignacion.findMany({
      where:  { agenteId, institucionId: tenantId, activo: true },
      select: {
        id:                      true,
        identificadorEstructural: true,
        unidad:                  { select: { nombre: true } },
      },
    })

    const asignacionIds = asignaciones.map(a => a.id)

    const [programadas, dictadas, suspendidas, reemplazadas] = await Promise.all([
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "PROGRAMADA"  } }),
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "DICTADA"     } }),
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "SUSPENDIDA"  } }),
      prisma.claseProgramada.count({ where: { asignacionId: { in: asignacionIds }, fecha: rango, estado: "REEMPLAZADA" } }),
    ])

    const incidencias = await prisma.incidencia.findMany({
      where: {
        asignacionId: { in: asignacionIds },
        fecha_desde:  { lte: new Date(fecha_hasta) },
        fecha_hasta:  { gte: new Date(fecha_desde) },
        activo:       true,
      },
      select: {
        id:          true,
        fecha_desde: true,
        fecha_hasta: true,
        observacion: true,
        codigarioItem: { select: { codigo: true, nombre: true } },
      },
    })

    const [reemplazosComoTitular, reemplazosComoSuplente] = await Promise.all([
      prisma.reemplazo.count({
        where: { activo: true, asignacionTitularId:  { in: asignacionIds }, clase: { fecha: rango } },
      }),
      prisma.reemplazo.count({
        where: { activo: true, asignacionSuplenteId: { in: asignacionIds }, clase: { fecha: rango } },
      }),
    ])

    const total = programadas + dictadas + suspendidas + reemplazadas

    return Response.json({
      agente:      agente.agente,
      periodo:     { desde: fecha_desde, hasta: fecha_hasta },
      asignaciones,
      resumen: {
        total,
        programadas,
        dictadas,
        suspendidas,
        reemplazadas,
        porcentajeDictadas:    total > 0 ? Math.round((dictadas    / total) * 100) : 0,
        porcentajeSuspendidas: total > 0 ? Math.round((suspendidas / total) * 100) : 0,
        reemplazosComoTitular,
        reemplazosComoSuplente,
      },
      incidencias,
    })
  })
}