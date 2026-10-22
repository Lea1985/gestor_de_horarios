// lib/usecases/clases/resolverClasesVencidas.ts
//
// Recorre las ClaseProgramada en PROGRAMADA cuya fecha ya llegó (fecha <=
// hoy, en la fecha de calendario de la institución -- hoyLocal) y las hace
// pasar por el motor de resolución, para que las que correspondan queden
// DICTADA. Las de hoy solo pasan si su módulo ya terminó: esa decisión la
// toma el motor (claseTermino), no este filtro. Es el mecanismo que hoy falta: sin esto,
// el solo paso del tiempo nunca dispara resolverClase (que solo se llama
// por eventos: crear/eliminar incidencia, activar/cerrar período, etc.).
//
// Sin infraestructura de jobs/cron todavía -- se expone como usecase puro
// para invocarlo manualmente (script) hasta decidir cómo dispararlo
// automáticamente (cron real vs. resolución perezosa al leer vs. híbrido).
import prisma from "@/lib/prisma"
import { EstadoClase } from "@prisma/client"
import { resolverClase } from "@/lib/services/resolucionClaseService"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"

export async function resolverClasesVencidas(tenantId: number) {
  const hoy = hoyLocal()

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