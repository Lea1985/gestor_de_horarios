// app/api/modulosHorarios/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarModulos } from "@/lib/usecases/modulosHorarios/listarModulos"
import { crearModulo, DatosModuloInvalidosError, HorasInvalidasError, SolapamientoError, DiaInvalidoError } from "@/lib/usecases/modulosHorarios/crearModulo"

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
      if (error instanceof DatosModuloInvalidosError || error instanceof HorasInvalidasError || error instanceof DiaInvalidoError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof SolapamientoError) {
        return Response.json({ error: (error as Error).message }, { status: 409 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existente = await (await import("@/lib/prisma")).default.moduloHorario.findFirst({
          where: { institucionId: tenantId, dia_semana: body.dia_semana, hora_desde: body.hora_desde, hora_hasta: body.hora_hasta },
        })
        return Response.json({ error: "Ya existe un módulo con esos datos", modulo: existente }, { status: 409 })
      }
      console.error("Error creando módulo:", error)
      return Response.json({ error: "Error creando módulo" }, { status: 500 })
    }
  })
}