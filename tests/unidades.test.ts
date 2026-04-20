// tests/unidades.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let unidadId:      number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

function buildUnidad(overrides?: Record<string, unknown>) {
  return {
    codigoUnidad: Math.floor(Math.random() * 900000) + 100000,
    nombre:       `Aula Test ${randomUUID().slice(0, 8)}`,
    tipo:         "AULA",
    ...overrides,
  }
}

async function crearUnidad(overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/unidades`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildUnidad(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando unidad: ${res.status}`)
  return res.json()
}

// ─── POST /api/unidades ───────────────────────────────────────────────────────

describe("POST /api/unidades", () => {
  it("crea una unidad nueva", async () => {
    const body = buildUnidad()
    const res  = await fetch(`${BASE_URL}/unidades`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.codigoUnidad).toBe(body.codigoUnidad)
    expect(data).toHaveProperty("id")
    unidadId = data.id
  })

  it("rechaza código duplicado en la misma institución (409)", async () => {
    const body = buildUnidad()
    await crearUnidad(body)
    const res  = await fetch(`${BASE_URL}/unidades`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ ...buildUnidad(), codigoUnidad: body.codigoUnidad }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza sin nombre (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ codigoUnidad: 99999 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin codigoUnidad (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ nombre: "Sin codigo" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildUnidad()),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify(buildUnidad()),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/unidades ────────────────────────────────────────────────────────

describe("GET /api/unidades", () => {
  it("devuelve lista de unidades", async () => {
    const res  = await fetch(`${BASE_URL}/unidades`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((u: { id: number }) => u.id === unidadId)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/unidades/[id] ───────────────────────────────────────────────────

describe("GET /api/unidades/[id]", () => {
  it("devuelve la unidad por id", async () => {
    const res  = await fetch(`${BASE_URL}/unidades/${unidadId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(unidadId)
  })

  it("devuelve 404 para ID inexistente", async () => {
    const res = await fetch(`${BASE_URL}/unidades/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para ID inválido", async () => {
    const res = await fetch(`${BASE_URL}/unidades/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /api/unidades/[id] ─────────────────────────────────────────────────

describe("PATCH /api/unidades/[id]", () => {
  it("actualiza el nombre", async () => {
    const res  = await fetch(`${BASE_URL}/unidades/${unidadId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ nombre: "Aula Actualizada" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.nombre).toBe("Aula Actualizada")
  })

  it("rechaza body vacío (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades/${unidadId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/unidades/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ nombre: "test" }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades/${unidadId}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/unidades/[id] ────────────────────────────────────────────────

describe("DELETE /api/unidades/[id]", () => {
  it("hace soft delete de la unidad", async () => {
    const creada = await crearUnidad()
    const res    = await fetch(`${BASE_URL}/unidades/${creada.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("es idempotente — deleted:false la segunda vez", async () => {
    const creada = await crearUnidad()
    await fetch(`${BASE_URL}/unidades/${creada.id}`, { method: "DELETE", headers })
    const res  = await fetch(`${BASE_URL}/unidades/${creada.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("devuelve deleted:false para id inexistente", async () => {
    const res  = await fetch(`${BASE_URL}/unidades/999999`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/unidades/abc`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(400)
  })
})