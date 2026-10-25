// app/api/distribuciones/[id]/modulos/route.ts
import { withContext } from "@/lib/auth/withContext"
import {
  asignarModulos,
  DistribucionNoEncontradaError,
  ModulosInvalidosError,
  FormatoModulosInvalidoError,
  FechaDesdeInvalidaError,
  SinPeriodoActivoError,
} from "@/lib/usecases/distribuciones/asignarModulos"

function parseId(id: string) {
  const n = Number(id)
  return isNaN(n) ? null : n
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const distId = parseId(id)
  if (!distId) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const result = await asignarModulos(distId, tenantId, body)
      // Body: { modulos, desde?, confirmarAnulacion?, reescribirPasado?,
      // mantenerReemplazo? }. Si el servicio devolvió requiereConfirmacion
      // (con el aviso), respondemos 200 igual (no es un error, es una
      // pregunta al frontend), con el flag explícito para distinguirlo de
      // un éxito definitivo.
      return Response.json(result)
    } catch (error) {
      if (
        error instanceof FormatoModulosInvalidoError ||
        error instanceof ModulosInvalidosError ||
        error instanceof FechaDesdeInvalidaError
      ) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof DistribucionNoEncontradaError) {
        return Response.json({ error: (error as Error).message }, { status: 404 })
      }
      if (error instanceof SinPeriodoActivoError) {
        return Response.json({ error: (error as Error).message }, { status: 409 })
      }
      console.error("Error asignando módulos:", error)
      return Response.json({ error: "Error asignando módulos" }, { status: 500 })
    }
  })
}
