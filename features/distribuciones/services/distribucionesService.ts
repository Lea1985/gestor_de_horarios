// features/distribuciones/services/distribucionesService.ts
// Capa de acceso a la API REST para la feature Distribuciones.
import type { Distribucion, Asignacion, EliminarDistribucionResult } from "../types"
type CreateDistribucionPayload = {
  asignacionId:         number
  version:              number
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string | null
}
export const distribucionesService = {
  async listar(headers: Record<string, string>): Promise<Distribucion[]> {
    const res = await fetch("/api/distribuciones", { headers })
    if (!res.ok) throw new Error("Error cargando distribuciones")
    return res.json()
  },
  async listarAsignaciones(headers: Record<string, string>): Promise<Asignacion[]> {
    const res = await fetch("/api/asignaciones", { headers })
    if (!res.ok) throw new Error("Error cargando asignaciones")
    return res.json()
  },
  async crear(payload: CreateDistribucionPayload, headers: Record<string, string>): Promise<Distribucion> {
    const res = await fetch("/api/distribuciones", {
      method:  "POST",
      headers,
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error creando distribución")
    return data
  },
  // UX-DIS-011/151: ya no manda mantenerReemplazo ni body -- el DELETE es
  // directo. Si el backend bloquea (no ACTIVO, o tiene incidencias
  // asociadas), tira 409 con el motivo real en data.error.
  async eliminar(
    id: number,
    headers: Record<string, string>
  ): Promise<EliminarDistribucionResult> {
    const res = await fetch(`/api/distribuciones/${id}`, {
      method:  "DELETE",
      headers,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error eliminando distribución")
    return data
  },
}