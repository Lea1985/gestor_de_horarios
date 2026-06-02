// app/api/turnos/[id]/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { obtenerTurno } from "@/lib/usecases/turnos/obtenerTurno"
import { actualizarTurno } from "@/lib/usecases/turnos/actualizarTurno"
import { eliminarTurno, TurnoNoEncontradoError, TieneAsignacionesActivasError } from "@/lib/usecases/turnos/eliminarTurno"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const turnoId = parseId(id)
  if (!turnoId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      const turno = await obtenerTurno(turnoId, tenantId)
      if (!turno) return Response.json({ error: "Turno no encontrado" }, { status: 404 })
      return Response.json(turno)
    } catch {
      return Response.json({ error: "Error obteniendo turno" }, { status: 500 })
    }
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const turnoId = parseId(id)
  if (!turnoId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarTurno(turnoId, tenantId, body))
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Turno no encontrado") return Response.json({ error: error.message }, { status: 404 })
        if (error.message === "El nombre es obligatorio" || error.message === "La hora de inicio debe ser menor a la hora fin") {
          return Response.json({ error: error.message }, { status: 400 })
        }
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe un turno con ese nombre" }, { status: 409 })
      }
      return Response.json({ error: "Error actualizando turno" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const turnoId = parseId(id)
  if (!turnoId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await eliminarTurno(turnoId, tenantId))
    } catch (error) {
      if (error instanceof TurnoNoEncontradoError) return Response.json({ error: error.message }, { status: 404 })
      if (error instanceof TieneAsignacionesActivasError) return Response.json({ error: error.message }, { status: 409 })
      return Response.json({ error: "Error eliminando turno" }, { status: 500 })
    }
  })
}