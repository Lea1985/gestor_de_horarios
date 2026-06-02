// features/modulosDistribucion/services/modulosDistribucionService.ts

import type { Modulo, Distribucion } from "../types"

export const modulosDistribucionService = {

  async listarModulos(headers: Record<string, string>): Promise<Modulo[]> {
    const res = await fetch("/api/modulosHorarios", { headers })
    if (!res.ok) throw new Error("Error cargando módulos")
    return res.json()
  },

  async obtenerDistribucion(id: string, headers: Record<string, string>): Promise<Distribucion> {
    const res = await fetch(`/api/distribuciones/${id}`, { headers })
    if (!res.ok) throw new Error("Error cargando distribución")
    return res.json()
  },

  async guardarModulos(id: string, modulos: number[], headers: Record<string, string>): Promise<void> {
    const res = await fetch(`/api/distribuciones/${id}/modulos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ modulos }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error guardando módulos")
  },

  async crearNuevaVersion(id: string, headers: Record<string, string>): Promise<{ nuevaVersionId: number }> {
    const res = await fetch(`/api/distribuciones/${id}/nueva-version`, {
      method:  "POST",
      headers,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error creando nueva versión")
    return data
  },
}