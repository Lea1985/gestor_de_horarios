import { DashboardOverviewResponse } from "../types"

export async function getDashboardOverview(
  authHeaders: HeadersInit
): Promise<DashboardOverviewResponse> {
  const response = await fetch("/api/dashboard/overview", {
    headers: authHeaders,
  })

  if (!response.ok) {
    throw new Error("Error al obtener dashboard overview")
  }

  return response.json()
}