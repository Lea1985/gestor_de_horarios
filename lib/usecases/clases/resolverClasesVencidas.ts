// lib/usecases/clases/resolverClasesVencidas.ts
//
// Recorre las ClaseProgramada en PROGRAMADA cuya fecha ya llegó (fecha <=
// hoy) y las hace pasar por el motor de resolución, para que las que
// correspondan queden DICTADA. Es el mecanismo que hoy falta: sin esto,
// el solo paso del tiempo nunca dispara resolverClase (que solo se llama
// por eventos: crear/eliminar incidencia, activar/cerrar período, etc.).
//
// Sin infraestructura de jobs/cron todavía -- se expone como usecase puro
// para invocarlo manualmente (script) hasta decidir cómo dispararlo
// automáticamente (cron real vs. resolución perezosa al leer vs. híbrido).
import prisma from "@/lib/prisma"
import { EstadoClase } from "@prisma/client"
import { resolverClase } from "@/lib/services/resolucionClaseService"

export async function resolverClasesVencidas(tenantId: number) {
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)

  const idsARevisar = (
    await prisma.claseProgramada.findMany({
      where: {
        institucionId: tenantId,
        estado: EstadoClase.PROGRAMADA,
        fecha: { lte: hoy },
      },
      select: { id: true },
    })
  ).map(c => c.id)

  let clasesMarcadasDictadas = 0
  for (const claseId of idsARevisar) {
    const r = await resolverClase(claseId, tenantId)
    if (r.estado === EstadoClase.DICTADA) clasesMarcadasDictadas++
  }

  return { clasesRevisadas: idsARevisar.length, clasesMarcadasDictadas }
}