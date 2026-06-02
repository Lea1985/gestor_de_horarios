// app/api/calendario-escolar/route.ts

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

import { listarCalendarioEscolar }
  from "@/lib/usecases/calendarioEscolar/listarCalendarioEscolar"

import {
  crearCalendarioEscolar,
  DatosCalendarioEscolarInvalidosError,
  PeriodoOperativoNoEncontradoError,
  FechaFueraDePeriodoError,
} from "@/lib/usecases/calendarioEscolar/crearCalendarioEscolar"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)

    const incluirInactivos =
      searchParams.get("inactivos") === "true"

    const rawId = searchParams.get("periodoOperativoId")
    const periodoOperativoId = rawId ? Number(rawId) : NaN

    if (!rawId || isNaN(periodoOperativoId)) {
      return Response.json(
        { error: "periodoOperativoId es requerido" },
        { status: 400 }
      )
    }

    try {
      const calendario = await listarCalendarioEscolar(
        tenantId,
        periodoOperativoId,
        incluirInactivos
      )
      return Response.json(calendario)
    } catch (error) {
      console.error("Error listando calendario escolar:", error)
      return Response.json(
        { error: "Error listando calendario escolar" },
        { status: 500 }
      )
    }
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body

    try {
      body = await req.json()
    } catch {
      return Response.json(
        { error: "JSON inválido" },
        { status: 400 }
      )
    }

    try {
      const result = await crearCalendarioEscolar(tenantId, body)
      return Response.json(result, { status: 201 })
    } catch (error) {

      if (error instanceof DatosCalendarioEscolarInvalidosError) {
        return Response.json(
          { error: error.message },
          { status: 400 }
        )
      }

      if (error instanceof PeriodoOperativoNoEncontradoError) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      if (error instanceof FechaFueraDePeriodoError) {
        return Response.json(
          { error: error.message },
          { status: 400 }
        )
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Ya existe un evento para esa fecha en esta institución" },
          { status: 409 }
        )
      }

      console.error("Error creando evento de calendario escolar:", error)
      return Response.json(
        { error: "Error creando evento de calendario escolar" },
        { status: 500 }
      )
    }
  })
}