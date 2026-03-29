// app/api/clases/[id]/route.ts
import { withTenant } from "@/lib/tenant/withTenant"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return Response.json({ error: "ID inválido" }, { status: 400 })
    }

    const clase = await prisma.claseProgramada.findFirst({
      where: { id, institucionId: tenantId },
      include: {
        modulo:     true,
        unidad:     true,
        asignacion: {
          include: {
            agente: {
              select: { nombre: true, apellido: true, documento: true }
            }
          }
        },
        incidencia: {
          include: {
            codigarioItem: {
              select: { codigo: true, nombre: true }
            }
          }
        },
        reemplazos: {
          include: {
            asignacionTitular:  { select: { identificadorEstructural: true } },
            asignacionSuplente: { select: { identificadorEstructural: true } }
          }
        }
      }
    })

    if (!clase) {
      return Response.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    return Response.json(clase)

  }, req)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return Response.json({ error: "ID inválido" }, { status: 400 })
    }

    let body: {
      estado?: string
      incidenciaId?: number | null
    }

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { estado, incidenciaId } = body

    if (estado === undefined && incidenciaId === undefined) {
      return Response.json(
        { error: "Se requiere al menos: estado o incidenciaId" },
        { status: 400 }
      )
    }

    const estadosValidos = ["PROGRAMADA", "DICTADA", "SUSPENDIDA", "REEMPLAZADA"]
    if (estado && !estadosValidos.includes(estado)) {
      return Response.json(
        { error: `Estado inválido. Válidos: ${estadosValidos.join(", ")}` },
        { status: 400 }
      )
    }

    const existente = await prisma.claseProgramada.findFirst({
      where: { id, institucionId: tenantId }
    })

    if (!existente) {
      return Response.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    if (incidenciaId) {
      const incidencia = await prisma.incidencia.findFirst({
        where: { id: incidenciaId, asignacionId: existente.asignacionId }
      })
      if (!incidencia) {
        return Response.json(
          { error: "Incidencia no encontrada o no pertenece a la asignación de esta clase" },
          { status: 400 }
        )
      }
    }

    const data: any = {}
    if (estado       !== undefined) data.estado      = estado
    if (incidenciaId !== undefined) data.incidenciaId = incidenciaId

    const actualizada = await prisma.claseProgramada.update({
      where: { id },
      data
    })

    return Response.json(actualizada)

  }, req)
}