// app/api/incidencias/validar-superposicion/route.ts

import { withContext } from "@/lib/auth/withContext"
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { asignacionId, fecha_desde, fecha_hasta, excludeId } = body

    if (!asignacionId || !fecha_desde || !fecha_hasta) {
      return Response.json(
        { error: "asignacionId, fecha_desde y fecha_hasta son requeridos" },
        { status: 400 }
      )
    }

    const asignacion = await incidenciaRepository.verificarAsignacionBasica(
      Number(asignacionId),
      tenantId
    )
    if (!asignacion) {
      return Response.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    const conflicto = await incidenciaRepository.verificarSuperposicion(
      Number(asignacionId),
      new Date(fecha_desde),
      new Date(fecha_hasta),
      excludeId ? Number(excludeId) : undefined
    )

    return Response.json({
      tieneSuperposicion: !!conflicto,
      conflicto:          conflicto ?? null,
    })
  })
}