// lib/usecases/incidencias/obtenerCadena.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"
import prisma from "@/lib/prisma"

export class IncidenciaNoEncontradaError extends Error {
  constructor() {
    super("Incidencia no encontrada")
  }
}

type Agente = { nombre: string; apellido: string; documento: string }

type ItemCadenaCrudo = {
  id:                number
  asignacionId:      number
  incidenciaPadreId: number | null
  fecha_desde:       Date
  fecha_hasta:       Date
  tipo:              string | null
}

export async function obtenerCadena(id: number, tenantId: number) {
  const existe = await incidenciaRepository.obtenerPorId(id, tenantId)
  if (!existe) {
    throw new IncidenciaNoEncontradaError()
  }

  const cadena = await incidenciaRepository.cadena(id, tenantId) as ItemCadenaCrudo[]

  // Ventana exclusiva de cada incidencia dentro de su propia cadena: si
  // tiene una hija (en esta misma cadena), su ventana propia termina el
  // día antes de que arranque la hija -- mismo criterio ya validado en
  // ausencias.ts (causa 1, 17/08/2026) para no mezclar el reemplazante de
  // la hija en el eslabón del padre.
  const primerHijoPorPadre = new Map<number, Date>()
  for (const item of cadena) {
    if (!item.incidenciaPadreId) continue
    const actual = primerHijoPorPadre.get(item.incidenciaPadreId)
    if (!actual || item.fecha_desde < actual) {
      primerHijoPorPadre.set(item.incidenciaPadreId, item.fecha_desde)
    }
  }

  const reemplazantePorIncidencia = new Map<number, Agente>()

  await Promise.all(
    cadena.map(async (item) => {
      const inicioHijo = primerHijoPorPadre.get(item.id) ?? null
      let finVentana = item.fecha_hasta
      if (inicioHijo && inicioHijo <= item.fecha_hasta) {
        finVentana = new Date(inicioHijo)
        finVentana.setUTCDate(finVentana.getUTCDate() - 1)
      }
      if (finVentana < item.fecha_desde) return

      const clases = await prisma.claseProgramada.findMany({
        where: {
          institucionId: tenantId,
          asignacionId:  item.asignacionId,
          fecha: { gte: item.fecha_desde, lte: finVentana },
        },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        select: {
          reemplazos: {
            orderBy: { id: "asc" },
            select: {
              activo: true,
              agenteSuplente: { select: { nombre: true, apellido: true, documento: true } },
            },
          },
        },
      })

      // Solo mostramos el reemplazante ACTIVO (quién cubre ahora). Si un
      // reemplazo fue quitado, no debe seguir apareciendo acá -- antes
      // caía a "el último que cubrió, como referencia" incluso después
      // de un Quitar explícito, mostrando data vieja indefinidamente e
      // inconsistente con "Clases afectadas" (que sí muestra "Sin
      // cubrir" correctamente). Recorremos TODAS las clases de la
      // ventana, no solo la primera que tuvo algún reemplazo alguna vez
      // (bug encontrado 24/08/2026).
      for (const clase of clases) {
        const activo = clase.reemplazos.find(r => r.activo)
        if (activo?.agenteSuplente) {
          reemplazantePorIncidencia.set(item.id, activo.agenteSuplente)
          break
        }
      }
    })
  )

  return [...cadena]
    .sort((a, b) => a.fecha_desde.getTime() - b.fecha_desde.getTime())
    .map(item => {
      const r = reemplazantePorIncidencia.get(item.id) ?? null
      return {
        ...item,
        reemplazante: r ? { nombre: `${r.apellido}, ${r.nombre}`, documento: r.documento } : null,
      }
    })
}