import { withContext } from "@/lib/auth/withContext"
import { listarIncidencias } from "@/lib/usecases/incidencias/listarIncidencias"
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const asignacionId = parseId(id)
  if (!asignacionId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const asignacion = await incidenciaRepository.verificarAsignacionBasica(asignacionId, tenantId)
    if (!asignacion) return Response.json({ error: "Asignación no encontrada" }, { status: 404 })

    return Response.json(await listarIncidencias(tenantId, asignacionId))
  })
}