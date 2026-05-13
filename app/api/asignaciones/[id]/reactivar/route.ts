import { withContext } from "@/lib/auth/withContext"
import { reactivarAsignacion, AsignacionNoEncontradaError } from "@/lib/usecases/asignaciones/reactivarAsignacion"

function parseId(id: string) {
  const n = Number(id)
  return Number.isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)

  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      const result = await reactivarAsignacion(id, tenantId)
      return Response.json(result)
    } catch (error) {
      if (error instanceof AsignacionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      console.error("Error reactivando asignación:", error)
      return Response.json({ error: "Error reactivando asignación" }, { status: 500 })
    }
  })
}