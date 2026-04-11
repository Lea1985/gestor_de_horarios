// tests/multiTenant.test.ts
import { describe, it, expect } from "vitest"
import { authHeaders } from "./helpers/auth"

const baseUrl = "http://localhost:3000"

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options)

  let data = null
  try {
    data = await res.json()
  } catch {
    console.log("⚠️ Error parseando JSON")
  }

  return { res, data }
}

describe("Multi-tenant isolation", () => {
  it("no debería permitir acceder a datos de otro tenant", async () => {
    const headersTenant1 = await authHeaders("1")
    const headersTenant2 = await authHeaders("2")

    // ── Crear agente en tenant 1 ───────────────────────────────────────────
    const payload = {
      nombre:    "Agente Test " + Date.now(),
      apellido:  "Test",
      documento: String(Math.floor(Math.random() * 10000000)), // ✅ String
    }

    const create = await request(`${baseUrl}/api/agentes`, {
      method: "POST",
      headers: headersTenant1,
      body: JSON.stringify(payload),
    })

    expect(create.res.status).toBe(201)

    // La API devuelve { agente, agenteInstitucion }
    const documentoCreado = create.data?.agente?.documento
    expect(documentoCreado).toBeDefined()

    // ── Listar en tenant 1 → debe aparecer ────────────────────────────────
    const listTenant1 = await request(`${baseUrl}/api/agentes`, {
      headers: headersTenant1,
    })

    expect(listTenant1.res.status).toBe(200)

    // El GET devuelve AgenteInstitucion[] con { agente: { documento, ... } }
    const creadoEnTenant1 = listTenant1.data.find(
      (a: any) => a.agente?.documento === documentoCreado // ✅ ruta correcta
    )

    expect(creadoEnTenant1).toBeDefined()

    // ── Listar en tenant 2 → NO debe aparecer ─────────────────────────────
    const listTenant2 = await request(`${baseUrl}/api/agentes`, {
      headers: headersTenant2,
    })

    expect(listTenant2.res.status).toBe(200)

    const encontradoEnTenant2 = listTenant2.data.find(
      (a: any) => a.agente?.documento === documentoCreado // ✅ ruta correcta
    )

    expect(encontradoEnTenant2).toBeUndefined()
  })

  it("debería bloquear si el token pertenece a otro tenant", async () => {
    const headersTenant1 = await authHeaders("1")

    // Usar el token del tenant 1 pero pedir acceso al tenant 2
    const res = await fetch(`${baseUrl}/api/agentes`, {
      headers: {
        ...headersTenant1,
        "x-tenant-id": "2",
      },
    })

    let data = null
    try {
      data = await res.json()
    } catch {
      console.log("⚠️ Error parseando JSON en mismatch")
    }

    expect(res.status).toBe(403)
    expect(data?.error).toBe("No autorizado para este tenant")
  })
})