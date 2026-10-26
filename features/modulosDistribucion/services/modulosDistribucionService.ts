// features/modulosDistribucion/services/modulosDistribucionService.ts
import type { Modulo, Distribucion, AvisoReconciliacion, OpcionesReconciliacion } from "../types"

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

  async guardarModulos(
    id: string,
    modulos: number[],
    headers: Record<string, string>,
    opciones: OpcionesReconciliacion = {}
  ): Promise<{
    ok: boolean
    requiereConfirmacion?: boolean
    aviso?: AvisoReconciliacion
    total?: number
    clasesCreadas?: number
    avisoSinPeriodoActivo?: boolean
  }> {
    const res = await fetch(`/api/distribuciones/${id}/modulos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ modulos, ...opciones }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error guardando módulos")
    return data
  },

  async crearNuevaVersion(
    id: string,
    headers: Record<string, string>,
    opciones: OpcionesReconciliacion = {}
  ): Promise<{
    ok: boolean
    nuevaVersionId?: number
    version?: number
    requiereConfirmacion?: boolean
    aviso?: AvisoReconciliacion
  }> {
    const res = await fetch(`/api/distribuciones/${id}/nueva-version`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(opciones),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error creando nueva versión")
    return data
  },
}
