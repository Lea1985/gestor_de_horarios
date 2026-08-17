// lib/pdf/datasets/titularVigenteEn.ts
/**
 * Busca, dentro del historial de titularidades de una asignación, quién
 * era el titular vigente en una fecha puntual (no simplemente el más
 * reciente / actualmente activo).
 *
 * Genérico sobre el tipo de Agente porque cada dataset selecciona
 * distintos campos del agente según lo que necesita mostrar (ausencias.ts
 * incluye id, profesor.ts no).
 *
 * Extraído el 18/08/2026: estaba duplicada de forma idéntica en
 * ausencias.ts y profesor.ts (tarea #60).
 */
export function titularVigenteEn<A>(
  titularidades: { fecha_desde: Date; fecha_hasta: Date | null; agente: A | null }[],
  fecha: Date
): A | null {
  const vigente = titularidades.find(
    t => t.fecha_desde <= fecha && (!t.fecha_hasta || t.fecha_hasta >= fecha)
  )
  return vigente?.agente ?? null
}
