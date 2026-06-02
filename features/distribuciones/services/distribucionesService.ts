// features/distribuciones/services/distribucionesService.ts
// Capa de acceso a la API REST para la feature Distribuciones.
// Extraído de app/protected/dashboard/distribuciones/page.tsx — paso 2.

import type { Distribucion, Asignacion } from "../types"

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

  async eliminar(id: number, headers: Record<string, string>): Promise<void> {
    const res = await fetch(`/api/distribuciones/${id}`, {
      method:  "DELETE",
      headers,
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Error eliminando distribución")
    }
  },
}