// tests/helpers/auth.ts

export const BASE_URL = "http://localhost:3000/api"

export function authHeaders(tenantId: string, token: string): Record<string, string> {
  return {
    "Content-Type":  "application/json",
    "x-tenant-id":   tenantId,
    "Authorization": `Bearer ${token}`,
  }
}