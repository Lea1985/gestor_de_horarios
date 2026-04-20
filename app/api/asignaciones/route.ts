//api/asignaciones/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarAsignaciones } from "@/lib/usecases/asignaciones/listarAsignaciones"
import { crearAsignacion, DatosAsignacionInvalidosError, EntidadNoEncontradaError } from "@/lib/usecases/asignaciones/crearAsignacion"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const asignaciones = await listarAsignaciones(tenantId)
    return Response.json(asignaciones)
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      const nueva = await crearAsignacion(tenantId, body)
      return Response.json(nueva, { status: 201 })
    } catch (error) {
      if (error instanceof DatosAsignacionInvalidosError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof EntidadNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "El identificador estructural ya existe en esta institución" }, { status: 409 })
      }
      console.error("Error creando asignación:", error)
      return Response.json({ error: "Error creando asignación" }, { status: 500 })
    }
  })
}
