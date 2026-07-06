// app/api/turnos/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import { reactivarTurno, TurnoNoEncontradoError } from "@/lib/usecases/turnos/reactivarTurno"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const turnoId = parseId(id)
  if (!turnoId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await reactivarTurno(turnoId, tenantId))
    } catch (error) {
      if (error instanceof TurnoNoEncontradoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: (error as Error).message ?? "Error reactivando turno" }, { status: 409 })
    }
  })
}