import { withContext } from "@/lib/auth/withContext"
import { asignarModulos, DistribucionNoEncontradaError, ModulosInvalidosError, FormatoModulosInvalidoError } from "@/lib/usecases/distribuciones/asignarModulos"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const distId = parseId(id)
  if (!distId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await asignarModulos(distId, tenantId, body))
    } catch (error) {
      if (error instanceof FormatoModulosInvalidoError || error instanceof ModulosInvalidosError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof DistribucionNoEncontradaError) {
        return Response.json({ error: (error as Error).message }, { status: 404 })
      }
      return Response.json({ error: "Error asignando módulos" }, { status: 500 })
    }
  })
}