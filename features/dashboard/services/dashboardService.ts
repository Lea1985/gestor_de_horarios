// features/dashboard/services/dashboardService.ts
import { DashboardOverviewResponse, RangoDias } from "../types"

export async function getDashboardOverview(
  authHeaders: HeadersInit,
  dias: RangoDias = 14
): Promise<DashboardOverviewResponse> {
  const response = await fetch(`/api/dashboard/overview?dias=${dias}`, {
    headers: authHeaders,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? "Error al obtener dashboard overview")
  }
  return response.json()
}
