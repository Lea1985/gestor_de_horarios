// features/asignaciones/services/asignacionesService.ts

import type { Asignacion, Agente, Unidad, Materia, Comision, Turno } from "../types"

export const asignacionesService = {

  async listar(headers: Record<string, string>, inactivas: boolean): Promise<Asignacion[]> {
    const res = await fetch(`/api/asignaciones?inactivas=${String(inactivas)}`, { headers })
    if (!res.ok) throw new Error("Error cargando asignaciones")
    return res.json()
  },

  async listarCombos(headers: Record<string, string>): Promise<{
    agentes:    Agente[]
    unidades:   Unidad[]
    materias:   Materia[]
    comisiones: Comision[]
    turnos:     Turno[]
  }> {
    const [rA, rU, rM, rCo, rT] = await Promise.all([
      fetch("/api/agentes",    { headers }),
      fetch("/api/unidades",   { headers }),
      fetch("/api/materias",   { headers }),
      fetch("/api/comisiones", { headers }),
      fetch("/api/turnos",     { headers }),
    ])
    return {
      agentes:    rA.ok  ? await rA.json()  : [],
      unidades:   rU.ok  ? await rU.json()  : [],
      materias:   rM.ok  ? await rM.json()  : [],
      comisiones: rCo.ok ? await rCo.json() : [],
      turnos:     rT.ok  ? await rT.json()  : [],
    }
  },

  async tieneHistorial(id: number, headers: Record<string, string>): Promise<boolean> {
    const res = await fetch(`/api/asignaciones/${id}?historial=true`, { headers })
    if (!res.ok) return false
    const data = await res.json()
    return data.tieneHistorial ?? false
  },

  async crear(payload: Record<string, unknown>, headers: Record<string, string>): Promise<void> {
    const res = await fetch("/api/asignaciones", {
      method:  "POST",
      headers,
      body:    JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Error creando asignación")
    }
  },

  async actualizar(id: number, payload: Record<string, unknown>, headers: Record<string, string>): Promise<void> {
    const res = await fetch(`/api/asignaciones/${id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Error actualizando asignación")
    }
  },

  async eliminar(id: number, headers: Record<string, string>): Promise<void> {
    const res = await fetch(`/api/asignaciones/${id}`, {
      method:  "DELETE",
      headers,
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Error eliminando asignación")
    }
  },

  async reactivar(id: number, headers: Record<string, string>): Promise<void> {
    const res = await fetch(`/api/asignaciones/${id}/reactivar`, {
      method:  "POST",
      headers,
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Error reactivando asignación")
    }
  },

  async cambiarTitular(id: number, agenteId: number, headers: Record<string, string>): Promise<void> {
    const res = await fetch(`/api/asignaciones/${id}/titular`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ agenteId }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Error cambiando titular")
    }
  },
}