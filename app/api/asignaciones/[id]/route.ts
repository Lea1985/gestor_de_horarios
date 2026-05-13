// ─────────────────────────────────────────────────────────────────────────────
// app/api/asignaciones/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { withContext } from "@/lib/auth/withContext"

import {
  obtenerAsignacion,
  AsignacionNoEncontradaError as ObtenerNoEncontradaError,
} from "@/lib/usecases/asignaciones/obtenerAsignacion"

import {
  actualizarAsignacion,
  SinCamposParaActualizarError,
  AsignacionNoEncontradaError,
  DatosAsignacionInvalidosError,
  EdicionRestringidaError,
} from "@/lib/usecases/asignaciones/actualizarAsignacion"

import { eliminarAsignacion } from "@/lib/usecases/asignaciones/eliminarAsignacion"

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
      const data = await obtenerAsignacion(id, tenantId)
      return Response.json(data)
    } catch (error) {
      if (error instanceof ObtenerNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }

      return Response.json(
        { error: "Error obteniendo asignación" },
        { status: 500 }
      )
    }
  })
}

export async function PATCH(
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

    try {
      const updated = await actualizarAsignacion(id, tenantId, body)
      return Response.json(updated)
    } catch (error) {
      if (error instanceof SinCamposParaActualizarError) {
        return Response.json({ error: error.message }, { status: 400 })
      }

      if (error instanceof DatosAsignacionInvalidosError) {
        return Response.json({ error: error.message }, { status: 400 })
      }

      if (error instanceof AsignacionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }

      // 409 para indicar que el cambio estructural no está permitido
      // mientras la asignación tenga entidades relacionadas.
      if (error instanceof EdicionRestringidaError) {
        return Response.json({ error: error.message }, { status: 409 })
      }

      return Response.json(
        { error: "Error actualizando asignación" },
        { status: 500 }
      )
    }
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)

  if (!id) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
    const result = await eliminarAsignacion(id, tenantId)
    return Response.json(result)
  })
}

