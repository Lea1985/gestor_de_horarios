// features/dashboard/services/rankingsService.ts

import { RangoRankings, RankingsData } from "../types/rankings"

export async function fetchRankings(
  rango:   RangoRankings,
  headers: HeadersInit,
  limite = 5,
): Promise<RankingsData> {
  const params = new URLSearchParams({ rango, limite: String(limite) })
  const res = await fetch(`/api/dashboard/rankings?${params}`, { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? "Error al obtener rankings")
  }
  return res.json()
}
