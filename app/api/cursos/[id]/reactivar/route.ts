// app/api/cursos/[id]/reactivar/route.ts
import { withContext } from "@/lib/auth/withContext"
import { reactivarCurso, CursoNoEncontradoError } from "@/lib/usecases/cursos/reactivarCurso"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const cursoId = parseId(id)
  if (!cursoId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await reactivarCurso(cursoId, tenantId))
    } catch (error) {
      if (error instanceof CursoNoEncontradoError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: (error as Error).message ?? "Error reactivando curso" }, { status: 409 })
    }
  })
}