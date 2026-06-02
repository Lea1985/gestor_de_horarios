// app/api/incidencias/[id]/clases/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withContext } from "@/lib/auth/withContext"
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withContext(req, async ({ tenantId }) => {
    const { id: rawId } = await params
    const id = Number(rawId)

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const incidencia = await incidenciaRepository.obtenerPorId(id, tenantId)
    if (!incidencia) {
      return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 })
    }

    const clases = await claseProgramadaRepository.listarPorIncidencia(
      tenantId,
      incidencia.asignacionId,
      incidencia.fecha_desde,
      incidencia.fecha_hasta,
    )

    return NextResponse.json(clases)
  })
}