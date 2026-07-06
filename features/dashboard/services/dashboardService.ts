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
    throw new Error("Error al obtener dashboard overview")
  }
  return response.json()
}
