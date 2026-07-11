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

  // IMPORTANTE: el DELETE puede devolver status 200 con { ok: false,
  // requiereConfirmacion: true, tramos: [...] } cuando hay reemplazos
  // activos en el tramo que se va a borrar — eso NO es un borrado
  // exitoso, es una pregunta. Por eso esta función devuelve el objeto
  // completo en vez de asumir éxito con solo chequear res.ok.
  async eliminar(
    id: number,
    headers: Record<string, string>,
    mantenerReemplazo?: boolean
  ): Promise<EliminarDistribucionResult> {
    const res = await fetch(`/api/distribuciones/${id}`, {
      method:  "DELETE",
      headers,
      body: JSON.stringify(
        mantenerReemplazo !== undefined ? { mantenerReemplazo } : {}
      ),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error eliminando distribución")
    return data
  },
}