

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

function parseDate(value: any): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Solapamiento de vigencia:
 * A solapa B si:
 * A.inicio <= B.fin AND A.fin >= B.inicio
 */
function solapa(
  inicioA: Date,
  finA: Date,
  inicioB: Date,
  finB: Date
) {
  return inicioA <= finB && finA >= inicioB
}

export async function GET(req: Request) {
  console.log( `GET /api/distribuciones`, await req.clone().text()) // log para debugging
  return withContext(req, async ({ tenantId }) => {
    const institucionId = Number(tenantId)

    const distribuciones = await prisma.distribucionHoraria.findMany({
      where: {
        institucionId,
        deletedAt: null,
      },
      include: {
        asignacion: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(distribuciones)
  })
}

export async function POST(req: Request) {
  console.log("POST /api/distribuciones - body:", await req.clone().text()) // log del body para debugging
  return withContext(req, async ({ tenantId }) => {
    const institucionId = Number(tenantId)

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const {
      asignacionId,
      version,
      fecha_vigencia_desde,
      fecha_vigencia_hasta,
    } = body

    if (!asignacionId || version == null || !fecha_vigencia_desde) {
      return Response.json(
        {
          error:
            "asignacionId, version y fecha_vigencia_desde son obligatorios",
        },
        { status: 400 }
      )
    }

    const desde = parseDate(fecha_vigencia_desde)
    const hasta = parseDate(fecha_vigencia_hasta) ?? new Date("9999-12-31")

    if (!desde) {
      return Response.json(
        { error: "fecha_vigencia_desde inválida" },
        { status: 400 }
      )
    }

    if (desde > hasta) {
      return Response.json(
        { error: "fecha_vigencia_desde debe ser menor o igual a fecha_vigencia_hasta" },
        { status: 400 }
      )
    }

    // ✔ Verificar asignación pertenece al tenant
    const asignacion = await prisma.asignacion.findFirst({
      where: {
        id: asignacionId,
        institucionId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!asignacion) {
      return Response.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      )
    }

    // ✔ 1. evitar versión duplicada para la misma asignación
    const versionExistente = await prisma.distribucionHoraria.findFirst({
      where: {
        asignacionId,
        version,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (versionExistente) {
      return Response.json(
        { error: "Ya existe esa versión para la asignación" },
        { status: 409 }
      )
    }

    // ✔ 2. solapamiento de vigencia
    const existentes = await prisma.distribucionHoraria.findMany({
      where: {
        asignacionId,
        deletedAt: null,
      },
    })

    const conflicto = existentes.find((d) => {
      const dInicio = new Date(d.fecha_vigencia_desde)
      const dFin =
        d.fecha_vigencia_hasta ?? new Date("9999-12-31")

      return solapa(desde, hasta, dInicio, dFin)
    })

    if (conflicto) {
      return Response.json(
        {
          error:
            "Existe una distribución activa en ese rango de fechas",
        },
        { status: 409 }
      )
    }

    try {
      const nueva = await prisma.distribucionHoraria.create({
        data: {
          institucionId,
          asignacionId,
          version,
          fecha_vigencia_desde: desde,
          fecha_vigencia_hasta:
            fecha_vigencia_hasta ? hasta : null,
        },
      })

      return Response.json(nueva, { status: 201 })
    } catch (error) {
      console.error("Error creando distribución:", error)

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "Conflicto de datos únicos" },
          { status: 409 }
        )
      }

      return Response.json(
        { error: "Error creando distribución" },
        { status: 500 }
      )
    }
  })
}