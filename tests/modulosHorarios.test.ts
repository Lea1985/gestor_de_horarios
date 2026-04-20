// tests/modulosHorarios.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion } from "./helpers/factories"

let headers:      Record<string, string>
let institucionId: number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

function buildModulo(overrides?: Record<string, unknown>) {
  return {
    dia_semana: "LUNES",
    hora_desde: 480,
    hora_hasta: 520,
    ...overrides,
  }
}

async function crearModulo(overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/modulosHorarios`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildModulo(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando módulo: ${res.status}`)
  return res.json()
}

// ─── GET /api/modulosHorarios ─────────────────────────────────────────────────

describe("GET /api/modulosHorarios", () => {
  it("devuelve lista de módulos", async () => {
    const res  = await fetch(`${BASE_URL}/modulosHorarios`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/modulosHorarios ────────────────────────────────────────────────

describe("POST /api/modulosHorarios", () => {
  it("crea un módulo", async () => {
    const body = buildModulo()
    const res  = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.dia_semana).toBe(body.dia_semana)
    expect(data.hora_desde).toBe(body.hora_desde)
    expect(data.hora_hasta).toBe(body.hora_hasta)
    expect(data).toHaveProperty("id")
  })

  it("rechaza duplicado (409)", async () => {
    const body = buildModulo({ dia_semana: "MARTES", hora_desde: 600, hora_hasta: 640 })
    await crearModulo(body)
    const res  = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza solapamiento de horario (409)", async () => {
    await crearModulo({ dia_semana: "MIERCOLES", hora_desde: 480, hora_hasta: 560 })
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ dia_semana: "MIERCOLES", hora_desde: 500, hora_hasta: 540 }),
    })
    expect(res.status).toBe(409)
  })

  it("no rechaza solapamiento en día distinto", async () => {
    await crearModulo({ dia_semana: "JUEVES", hora_desde: 480, hora_hasta: 520 })
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ dia_semana: "VIERNES", hora_desde: 480, hora_hasta: 520 }),
    })
    expect(res.status).toBe(201)
  })

  it("rechaza sin dia_semana (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ hora_desde: 480, hora_hasta: 520 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin hora_desde (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ dia_semana: "LUNES", hora_hasta: 520 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin hora_hasta (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ dia_semana: "LUNES", hora_desde: 480 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza hora_desde >= hora_hasta (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ dia_semana: "SABADO", hora_desde: 520, hora_hasta: 480 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza dia_semana inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ dia_semana: "LUNEZ", hora_desde: 480, hora_hasta: 520 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildModulo()),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify(buildModulo()),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/modulosHorarios/[id] ────────────────────────────────────────────

describe("GET /api/modulosHorarios/[id]", () => {
  it("devuelve el módulo por id", async () => {
    const creado = await crearModulo({ dia_semana: "DOMINGO", hora_desde: 480, hora_hasta: 520 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(creado.id)
    expect(data.dia_semana).toBe("DOMINGO")
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /api/modulosHorarios/[id] ─────────────────────────────────────────

describe("PATCH /api/modulosHorarios/[id]", () => {
  it("actualiza hora_hasta", async () => {
    const creado = await crearModulo({ dia_semana: "LUNES", hora_desde: 600, hora_hasta: 640 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ hora_hasta: 660 }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.hora_hasta).toBe(660)
  })

  it("actualiza dia_semana", async () => {
    const creado = await crearModulo({ dia_semana: "MARTES", hora_desde: 700, hora_hasta: 740 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ dia_semana: "MIERCOLES", hora_desde: 700, hora_hasta: 740 }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.dia_semana).toBe("MIERCOLES")
  })

  it("rechaza body vacío (400)", async () => {
    const creado = await crearModulo({ dia_semana: "JUEVES", hora_desde: 600, hora_hasta: 640 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza hora_desde >= hora_hasta (400)", async () => {
    const creado = await crearModulo({ dia_semana: "VIERNES", hora_desde: 600, hora_hasta: 640 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ hora_desde: 640, hora_hasta: 600 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza solapamiento (409)", async () => {
    await crearModulo({ dia_semana: "SABADO", hora_desde: 480, hora_hasta: 560 })
    const creado = await crearModulo({ dia_semana: "SABADO", hora_desde: 600, hora_hasta: 640 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ hora_desde: 500, hora_hasta: 540 }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ hora_hasta: 560 }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios/abc`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ hora_hasta: 560 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const creado = await crearModulo({ dia_semana: "DOMINGO", hora_desde: 600, hora_hasta: 640 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/modulosHorarios/[id] ────────────────────────────────────────

describe("DELETE /api/modulosHorarios/[id]", () => {
  it("soft delete del módulo", async () => {
    const creado = await crearModulo({ dia_semana: "LUNES", hora_desde: 800, hora_hasta: 840 })
    const res    = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("ya no aparece en GET después de eliminado", async () => {
    const creado = await crearModulo({ dia_semana: "MARTES", hora_desde: 800, hora_hasta: 840 })
    await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, { method: "DELETE", headers })
    const res = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, { headers })
    expect(res.status).toBe(404)
  })

  it("es idempotente — deleted:false la segunda vez", async () => {
    const creado = await crearModulo({ dia_semana: "MIERCOLES", hora_desde: 800, hora_hasta: 840 })
    await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, { method: "DELETE", headers })
    const res  = await fetch(`${BASE_URL}/modulosHorarios/${creado.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("devuelve deleted:false para id inexistente", async () => {
    const res  = await fetch(`${BASE_URL}/modulosHorarios/999999`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios/abc`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(400)
  })
})