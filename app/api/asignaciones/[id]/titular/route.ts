// ─────────────────────────────────────────────────────────────────────────────
// app/api/asignaciones/[id]/titular/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { withContext } from "@/lib/auth/withContext"

import {
  listarTitulares,
  AsignacionNoEncontradaError,
} from "@/lib/usecases/asignaciones/listarTitulares"

import {
  cambiarTitularAsignacion,
  TitularAsignacionError,
} from "@/lib/usecases/asignaciones/cambiarTitularAsignacion"

function parseId(id: string) {
  const n = Number(id)
  return Number.isNaN(n) ? null : n
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)

  if (!id) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    try {
      const titulares = await listarTitulares(id, tenantId)
      return Response.json(titulares)
    } catch (error) {
      if (error instanceof AsignacionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }

      return Response.json(
        { error: "Error obteniendo titulares" },
        { status: 500 }
      )
    }
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)

  if (!id) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    let body

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    if (!body.agenteId) {
      return Response.json({ error: "agenteId es requerido" }, { status: 400 })
    }

    try {
      const data = await cambiarTitularAsignacion(
        id,
        tenantId,
        Number(body.agenteId),
        body.fechaDesde
      )

      return Response.json(data)
    } catch (error) {
      if (error instanceof TitularAsignacionError) {
        return Response.json({ error: error.message }, { status: 400 })
      }

      return Response.json(
        { error: "Error cambiando titular" },
        { status: 500 }
      )
    }
  })
}
