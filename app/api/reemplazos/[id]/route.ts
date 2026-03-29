// app/api/reemplazos/[id]/route.ts
import { withTenant } from "@/lib/tenant/withTenant"
import prisma from "@/lib/prisma"

// ================================
// 🔹 GET /api/reemplazos/[id]
// ================================
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

    const reemplazo = await prisma.reemplazo.findFirst({
      where: {
        id,
        activo: true,
        clase: { institucionId: tenantId }
      },
      include: {
        clase: {
          include: {
            modulo: true,
            unidad: true
          }
        },
        asignacionTitular: {
          include: {
            agente: { select: { nombre: true, apellido: true, documento: true } }
          }
        },
        asignacionSuplente: {
          include: {
            agente: { select: { nombre: true, apellido: true, documento: true } }
          }
        }
      }
    })

    if (!reemplazo) {
      return Response.json({ error: "Reemplazo no encontrado" }, { status: 404 })
    }

    return Response.json(reemplazo)

  }, req)
}

// ================================
// 🔹 DELETE /api/reemplazos/[id]
// Soft delete — revierte la clase a PROGRAMADA
// ================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTenant(async (tenantId) => {

    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return Response.json({ error: "ID inválido" }, { status: 400 })
    }

    const reemplazo = await prisma.reemplazo.findFirst({
      where: {
        id,
        activo: true,
        clase: { institucionId: tenantId }
      }
    })

    if (!reemplazo) {
      return Response.json({ error: "Reemplazo no encontrado" }, { status: 404 })
    }

    // Soft delete del reemplazo y revertir estado de la clase
    await prisma.$transaction([
      prisma.reemplazo.update({
        where: { id },
        data: { activo: false, deletedAt: new Date() }
      }),
      prisma.claseProgramada.update({
        where: { id: reemplazo.claseId },
        data: { estado: "PROGRAMADA" }
      })
    ])

    return Response.json({ ok: true, deleted: true })

  }, req)
}