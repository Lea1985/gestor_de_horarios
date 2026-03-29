// app/api/clases/route.ts
import { withTenant } from "@/lib/tenant/withTenant"
import prisma from "@/lib/prisma"

// ================================
// 🔹 GET /api/clases
// Filtros: asignacionId, moduloId, unidadId, estado, fecha_desde, fecha_hasta
// ================================
export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const { searchParams } = new URL(req.url)

    const asignacionId  = searchParams.get("asignacionId")
    const moduloId      = searchParams.get("moduloId")
    const unidadId      = searchParams.get("unidadId")
    const estado        = searchParams.get("estado")
    const fecha_desde   = searchParams.get("fecha_desde")
    const fecha_hasta   = searchParams.get("fecha_hasta")

    // Al menos un filtro obligatorio para no traer todo
    if (!asignacionId && !unidadId && !fecha_desde) {
      return Response.json(
        { error: "Se requiere al menos uno de: asignacionId, unidadId, fecha_desde" },
        { status: 400 }
      )
    }

    const where: any = { institucionId: tenantId }

    if (asignacionId) where.asignacionId = parseInt(asignacionId)
    if (moduloId)     where.moduloId     = parseInt(moduloId)
    if (unidadId)     where.unidadId     = parseInt(unidadId)
    if (estado)       where.estado       = estado

    if (fecha_desde || fecha_hasta) {
      where.fecha = {}
      if (fecha_desde) where.fecha.gte = new Date(fecha_desde)
      if (fecha_hasta) where.fecha.lte = new Date(fecha_hasta)
    }

    const clases = await prisma.claseProgramada.findMany({
      where,
      orderBy: { fecha: "asc" },
      include: {
        modulo:     { select: { dia_semana: true, hora_desde: true, hora_hasta: true } },
        unidad:     { select: { nombre: true, codigoUnidad: true } },
        asignacion: { select: { identificadorEstructural: true, agenteId: true } },
        incidencia: { select: { id: true, fecha_desde: true, fecha_hasta: true, observacion: true } },
        reemplazos: { select: { id: true, asignacionTitularId: true, asignacionSuplenteId: true } }
      }
    })

    return Response.json(clases)

  }, req)
}