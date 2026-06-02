// features/incidencias/services/incidenciasService.ts
import type {
  Incidencia,
  IncidenciaDetalle,
  CadenaItem,
  AsignacionParaIncidencia,
  AgenteParaReemplazo,
  Codigario,
  CodigarioItem,
  ClaseAfectada,
} from "../types"

export async function fetchIncidencias(
  headers: Record<string, string>,
  eliminadas: boolean
): Promise<Incidencia[]> {
  const res = await fetch(`/api/incidencias?eliminadas=${String(eliminadas)}`, { headers })
  if (!res.ok) throw new Error("Error cargando incidencias")
  return res.json()
}

export async function deleteIncidencia(
  id: number,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/incidencias/${id}`, { method: "DELETE", headers })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Error eliminando")
  }
}

export async function reactivarIncidencia(
  id: number,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/incidencias/${id}/reactivar`, { method: "POST", headers })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Error reactivando incidencia")
  }
}

export async function fetchIncidenciaDetalle(
  id: string,
  headers: Record<string, string>
): Promise<IncidenciaDetalle> {
  const res = await fetch(`/api/incidencias/${id}`, { headers })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "No se pudo cargar la incidencia")
  }
  return res.json()
}

export async function fetchCadena(
  id: string,
  headers: Record<string, string>
): Promise<CadenaItem[]> {
  const res = await fetch(`/api/incidencias/${id}/cadena`, { headers })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchClasesAfectadas(
  id: string,
  headers: Record<string, string>
): Promise<ClaseAfectada[]> {
  const res = await fetch(`/api/incidencias/${id}/clases`, { headers })
  if (!res.ok) throw new Error("Error cargando clases afectadas")
  return res.json()
}

export async function fetchAsignaciones(
  headers: Record<string, string>
): Promise<AsignacionParaIncidencia[]> {
  const res = await fetch("/api/asignaciones", { headers })
  if (!res.ok) throw new Error("Error cargando asignaciones")
  return res.json()
}

export async function fetchAgentes(
  headers: Record<string, string>
): Promise<AgenteParaReemplazo[]> {
  const res = await fetch("/api/agentes", { headers })
  if (!res.ok) throw new Error("Error cargando agentes")
  return res.json()
}

export async function fetchCodigarios(
  headers: Record<string, string>
): Promise<Codigario[]> {
  const res = await fetch("/api/codigarios", { headers })
  if (!res.ok) throw new Error("Error cargando codigarios")
  return res.json()
}

export async function fetchItemsCodigario(
  id: string,
  headers: Record<string, string>
): Promise<CodigarioItem[]> {
  const res = await fetch(`/api/codigarios/${id}`, { headers })
  if (!res.ok) throw new Error("Error cargando items")
  const data = await res.json()
  return data.items ?? []
}

// Retorna la incidencia creada con su id para poder
// consultar sus clases en el paso 4 de reemplazos.
export async function crearIncidencia(
  payload: {
    asignacionId:    number
    codigarioItemId: number
    fecha_desde:     string
    fecha_hasta:     string
    observacion?:    string
    incidenciaPadreId?: number 

  },
  headers: Record<string, string>
): Promise<{ id: number }> {
  const res = await fetch("/api/incidencias", {
    method:  "POST",
    headers,
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Error desconocido")
  }
  return res.json()
}

export async function crearReemplazoService(
  payload: {
    claseId:             number
    asignacionTitularId: number
    agenteSuplenteId:    number
    reemplazoPadreId?:   number  
    observacion?:        string
  },
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch("/api/reemplazos", {
    method:  "POST",
    headers,
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Error creando reemplazo")
  }
}

export async function eliminarReemplazoService(
  id: number,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/reemplazos/${id}`, { method: "DELETE", headers })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Error eliminando reemplazo")
  }
}