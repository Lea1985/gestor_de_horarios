// tests/helpers/auth.ts
// Helpers de autenticación para tests.
// Versión SIN estado global (determinística).

export const BASE_URL = "http://localhost:3000/api"
export const TENANT_ID = "1"

const SEED_EMAIL = "admin@escuela12.edu.ar"
const SEED_PASSWORD = "password123"

/**
 * Login con credenciales del seed.
 * ⚠️ Cada llamada obtiene un token nuevo (sin cache).
 */
export async function getToken(tenantId: string): Promise<string> {
  const email =
    tenantId === "1"
      ? "admin@escuela12.edu.ar"
      : "admin@sanatoriosur.com.ar"

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
    },
    body: JSON.stringify({
      email,
      password: SEED_PASSWORD,
    }),
  })

  if (!res.ok) {
    throw new Error(`Login fallido: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()

  return data.token
}

/**
 * Headers base para requests autenticados en tests.
 * ⚠️ Usa un token nuevo en cada llamada.
 */
export async function authHeaders(tenantId: string) {
  const token = await getToken(tenantId)

  return {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
    Authorization: `Bearer ${token}`,
  }
}