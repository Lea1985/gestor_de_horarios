// features/incidencias/utils/coincideBusqueda.ts
import type { Incidencia } from "../types"

// Buscador del listado de incidencias: identificador, artículo y agente
// mostrado (en una hija, el suplente ausente).
export function coincideBusqueda(
  i: Pick<Incidencia, "asignacion" | "codigarioItem" | "agenteMostrado">,
  busqueda: string
): boolean {
  const q = busqueda.toLowerCase()
  return (
    (i.asignacion?.identificadorEstructural.toLowerCase().includes(q) ?? false) ||
    (i.codigarioItem?.nombre.toLowerCase().includes(q) ?? false) ||
    (i.codigarioItem?.codigo.toLowerCase().includes(q) ?? false) ||
    (i.agenteMostrado?.apellido.toLowerCase().includes(q) ?? false) ||
    (i.agenteMostrado?.nombre.toLowerCase().includes(q) ?? false)
  )
}
