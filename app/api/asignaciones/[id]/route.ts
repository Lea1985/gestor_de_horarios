import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import { obtenerAsignacion } from "@/lib/usecases/asignaciones/obtenerAsignacion"
import { actualizarAsignacion, SinCamposParaActualizarError } from "@/lib/usecases/asignaciones/actualizarAsignacion"
import { eliminarAsignacion } from "@/lib/usecases/asignaciones/eliminarAsignacion"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const data = await obtenerAsignacion(id, tenantId)
    return Response.json(data)
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const updated = await actualizarAsignacion(id, tenantId, body)
      return Response.json(updated)
    } catch (error) {
      if (error instanceof SinCamposParaActualizarError)
        return Response.json({ error: error.message }, { status: 400 })

      return Response.json({ error: "Error actualizando" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const result = await eliminarAsignacion(id, tenantId)
    return Response.json(result)
  })
}