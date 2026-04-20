// tests/agentes.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers: Record<string, string>
let institucionId: number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

function buildAgente() {
  const unique = randomUUID()
  return {
    nombre:    "Test",
    apellido:  "Agente",
    documento: `DOC-${unique}`,
    email:     `${unique}@test.com`,
  }
}

async function createAgente() {
  const agente = buildAgente()
  const res    = await fetch(`${BASE_URL}/agentes`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(agente),
  })
  if (res.status !== 201) {
    throw new Error(`Error creando agente: ${res.status}`)
  }
  const data = await res.json()
  return data.agente
}

describe("POST /api/agentes", () => {
  it("crea un agente nuevo", async () => {
    const agente = buildAgente()
    const res    = await fetch(`${BASE_URL}/agentes`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(agente),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.agente.documento).toBe(agente.documento)
  })

  it("rechaza documento duplicado en la misma institución", async () => {
    const agente = buildAgente()
    await fetch(`${BASE_URL}/agentes`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(agente),
    })
    const res = await fetch(`${BASE_URL}/agentes`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(agente),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza sin nombre (400)", async () => {
    const res = await fetch(`${BASE_URL}/agentes`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        apellido:  "Sin nombre",
        documento: `DOC-${randomUUID()}`,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/agentes`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildAgente()),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/agentes`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id":  String(institucionId),
      },
      body: JSON.stringify(buildAgente()),
    })
    expect(res.status).toBe(401)
  })
})

describe("GET /api/agentes", () => {
  it("devuelve lista de agentes", async () => {
    const res  = await fetch(`${BASE_URL}/agentes`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/agentes`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/agentes`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

describe("GET /api/agentes/[id]", () => {
  it("devuelve el agente creado", async () => {
    const agente = await createAgente()
    const res    = await fetch(`${BASE_URL}/agentes/${agente.id}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.agente.id).toBe(agente.id)
  })

  it("devuelve 404 para ID inexistente", async () => {
    const res = await fetch(`${BASE_URL}/agentes/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para ID inválido", async () => {
    const res = await fetch(`${BASE_URL}/agentes/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/agentes/[id]", () => {
  it("actualiza el email del agente", async () => {
    const agente   = await createAgente()
    const newEmail = `${randomUUID()}@test.com`
    const res      = await fetch(`${BASE_URL}/agentes/${agente.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ email: newEmail }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.email).toBe(newEmail)
  })

  it("rechaza body vacío (400)", async () => {
    const agente = await createAgente()
    const res    = await fetch(`${BASE_URL}/agentes/${agente.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/agentes/[id]", () => {
  it("hace soft delete del agente", async () => {
    const agente = await createAgente()
    const res    = await fetch(`${BASE_URL}/agentes/${agente.id}`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(200)
  })

  it("ya no aparece en GET después de eliminado", async () => {
    const agente = await createAgente()
    await fetch(`${BASE_URL}/agentes/${agente.id}`, {
      method:  "DELETE",
      headers,
    })
    const res = await fetch(`${BASE_URL}/agentes/${agente.id}`, { headers })
    expect(res.status).toBe(404)
  })
})