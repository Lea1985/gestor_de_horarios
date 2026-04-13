import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarModulos } from "@/lib/usecases/modulos/listarModulos"
import { crearModulo, DatosModuloInvalidosError, HorasInvalidasError, TurnoInvalidoError, SolapamientoError } from "@/lib/usecases/modulos/crearModulo"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    return Response.json(await listarModulos(tenantId))
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const nuevo = await crearModulo(tenantId, body)
      return Response.json(nuevo, { status: 201 })
    } catch (error) {
      if (error instanceof DatosModuloInvalidosError || error instanceof HorasInvalidasError || error instanceof TurnoInvalidoError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof SolapamientoError) {
        return Response.json({ error: (error as Error).message }, { status: 409 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe un módulo con esos datos" }, { status: 409 })
      }
      console.error("Error creando módulo:", error)
      return Response.json({ error: "Error creando módulo" }, { status: 500 })
    }
  })
}