// app/api/asignaciones/[id]/route.ts

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
  IdentificadorDuplicadoError,
} from "@/lib/usecases/asignaciones/actualizarAsignacion"
import {
  eliminarAsignacion,
  TieneIncidenciasActivasError,
  TieneReemplazosActivosError,
} from "@/lib/usecases/asignaciones/eliminarAsignacion"
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

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
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    const { searchParams } = new URL(req.url)

    if (searchParams.get("historial") === "true") {
      const existe = await asignacionRepository.existeEnTenant(id, tenantId)
      if (!existe) return Response.json({ error: "Asignación no encontrada" }, { status: 404 })
      const tieneHistorial = await asignacionRepository.tieneEntidadesRelacionadas(id)
      return Response.json({ tieneHistorial })
    }

    try {
      return Response.json(await obtenerAsignacion(id, tenantId))
    } catch (error) {
      if (error instanceof ObtenerNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      return Response.json({ error: "Error obteniendo asignación" }, { status: 500 })
    }
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    try {
      return Response.json(await actualizarAsignacion(id, tenantId, body))
    } catch (error) {
      if (error instanceof IdentificadorDuplicadoError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      if (error instanceof EdicionRestringidaError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      if (error instanceof AsignacionNoEncontradaError) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error instanceof DatosAsignacionInvalidosError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof SinCamposParaActualizarError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      return Response.json({ error: "Error actualizando asignación" }, { status: 500 })
    }
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 })

  return withContext(req, async ({ tenantId }) => {
    try {
      return Response.json(await eliminarAsignacion(id, tenantId))
    } catch (error) {
      if (error instanceof TieneIncidenciasActivasError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      if (error instanceof TieneReemplazosActivosError) {
        return Response.json({ error: error.message }, { status: 409 })
      }
      return Response.json({ error: "Error eliminando asignación" }, { status: 500 })
    }
  })
}