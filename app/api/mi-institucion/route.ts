// app/api/mi-institucion/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { obtenerMiInstitucion, InstitucionNoEncontradaError as ObtenerNotFound } from "@/lib/usecases/miInstitucion/obtenerMiInstitucion"
import { actualizarMiInstitucion, SinCamposError, EmailInvalidoError } from "@/lib/usecases/miInstitucion/actualizarMiInstitucion"

export const GET = (req: Request) =>
  withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await obtenerMiInstitucion(tenantId))
    } catch (error) {
      if (error instanceof ObtenerNotFound) return Response.json({ error: error.message }, { status: 404 })
      console.error(error)
      return Response.json({ error: "Error interno" }, { status: 500 })
    }
  })

export const PATCH = (req: Request) =>
  withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      return Response.json(await actualizarMiInstitucion(tenantId, body))
    } catch (error) {
      if (error instanceof SinCamposError || error instanceof EmailInvalidoError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return Response.json({ error: "Institución no encontrada" }, { status: 404 })
      }
      console.error(error)
      return Response.json({ error: "Error interno" }, { status: 500 })
    }
  })