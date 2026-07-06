// app/api/materias/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import { reactivarMateria, MateriaNoEncontradaError } from "@/lib/usecases/materias/reactivarMateria"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const materiaId = parseId(id)
  if (!materiaId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await reactivarMateria(materiaId, tenantId))
    } catch (error) {
      if (error instanceof MateriaNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: (error as Error).message ?? "Error reactivando materia" }, { status: 409 })
    }
  })
}