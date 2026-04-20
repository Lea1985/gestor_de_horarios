// app/api/distribuciones/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarDistribuciones } from "@/lib/usecases/distribuciones/listarDistribuciones"
import { crearDistribucion, DatosDistribucionInvalidosError, FechaInvalidaError, RangoFechasInvalidoError, AsignacionNoEncontradaError, VersionDuplicadaError, SolapamientoError } from "@/lib/usecases/distribuciones/crearDistribucion"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    return Response.json(await listarDistribuciones(tenantId))
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const nueva = await crearDistribucion(tenantId, body)
      return Response.json(nueva, { status: 201 })
    } catch (error) {
      if (error instanceof DatosDistribucionInvalidosError || error instanceof FechaInvalidaError || error instanceof RangoFechasInvalidoError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof AsignacionNoEncontradaError) {
        return Response.json({ error: (error as Error).message }, { status: 404 })
      }
      if (error instanceof VersionDuplicadaError || error instanceof SolapamientoError) {
        return Response.json({ error: (error as Error).message }, { status: 409 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Conflicto de datos únicos" }, { status: 409 })
      }
      console.error("Error creando distribución:", error)
      return Response.json({ error: "Error creando distribución" }, { status: 500 })
    }
  })
}