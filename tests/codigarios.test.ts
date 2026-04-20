// tests/codigarios.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion } from "./helpers/factories"
import { randomUUID } from "crypto"

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

function buildCodigario(overrides?: Record<string, unknown>) {
  return {
    nombre:      `COD-${randomUUID().slice(0, 8).toUpperCase()}`,
    descripcion: "Codigario de test",
    ...overrides,
  }
}

function buildItem(overrides?: Record<string, unknown>) {
  return {
    codigo:      `ITEM-${randomUUID().slice(0, 6).toUpperCase()}`,
    nombre:      "Item de test",
    descripcion: "Descripción de test",
    ...overrides,
  }
}

async function crearCodigario(overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/codigarios`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildCodigario(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando codigario: ${res.status}`)
  return res.json()
}

async function crearItem(codigarioId: number, overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildItem(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando item: ${res.status}`)
  return res.json()
}

// ─── GET /api/codigarios ───────────────────────────────────────────────────────

describe("GET /api/codigarios", () => {
  it("devuelve lista de codigarios", async () => {
    const res  = await fetch(`${BASE_URL}/codigarios`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/codigarios ──────────────────────────────────────────────────────

describe("POST /api/codigarios", () => {
  it("crea un codigario", async () => {
    const body = buildCodigario()
    const res  = await fetch(`${BASE_URL}/codigarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.nombre).toBe(body.nombre.toUpperCase())
    expect(data).toHaveProperty("id")
  })

  it("nombre se guarda en mayúsculas", async () => {
    const res  = await fetch(`${BASE_URL}/codigarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ nombre: "minusculas" }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.nombre).toBe("MINUSCULAS")
  })

  it("rechaza nombre duplicado (409)", async () => {
    const body = buildCodigario()
    await crearCodigario(body)
    const res  = await fetch(`${BASE_URL}/codigarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza sin nombre (400)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ descripcion: "sin nombre" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildCodigario()),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify(buildCodigario()),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/codigarios/[id] ──────────────────────────────────────────────────

describe("GET /api/codigarios/[id]", () => {
  it("devuelve el codigario con sus items", async () => {
    const creado = await crearCodigario()
    const res    = await fetch(`${BASE_URL}/codigarios/${creado.id}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(creado.id)
    expect(data).toHaveProperty("items")
    expect(Array.isArray(data.items)).toBe(true)
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /api/codigarios/[id] ────────────────────────────────────────────────

describe("PATCH /api/codigarios/[id]", () => {
  it("actualiza el nombre", async () => {
    const creado    = await crearCodigario()
    const nuevoNombre = `UPD-${randomUUID().slice(0, 6).toUpperCase()}`
    const res       = await fetch(`${BASE_URL}/codigarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ nombre: nuevoNombre }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.nombre).toBe(nuevoNombre.toUpperCase())
  })

  it("actualiza la descripcion", async () => {
    const creado = await crearCodigario()
    const res    = await fetch(`${BASE_URL}/codigarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ descripcion: "Nueva descripción" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.descripcion).toBe("Nueva descripción")
  })

  it("rechaza body vacío (400)", async () => {
    const creado = await crearCodigario()
    const res    = await fetch(`${BASE_URL}/codigarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza nombre duplicado (409)", async () => {
    const primero  = await crearCodigario()
    const segundo  = await crearCodigario()
    const res      = await fetch(`${BASE_URL}/codigarios/${segundo.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ nombre: primero.nombre }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ nombre: "NUEVO" }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/abc`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ nombre: "NUEVO" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const creado = await crearCodigario()
    const res    = await fetch(`${BASE_URL}/codigarios/${creado.id}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/codigarios/[id] ───────────────────────────────────────────────

describe("DELETE /api/codigarios/[id]", () => {
  it("elimina el codigario", async () => {
    const creado = await crearCodigario()
    const res    = await fetch(`${BASE_URL}/codigarios/${creado.id}`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it("ya no aparece en GET después de eliminado", async () => {
    const creado = await crearCodigario()
    await fetch(`${BASE_URL}/codigarios/${creado.id}`, { method: "DELETE", headers })
    const res = await fetch(`${BASE_URL}/codigarios/${creado.id}`, { headers })
    expect(res.status).toBe(404)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/999999`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/abc`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/codigarios/[id]/items ───────────────────────────────────────────

describe("GET /api/codigarios/[id]/items", () => {
  it("devuelve items del codigario", async () => {
    const codigario = await crearCodigario()
    await crearItem(codigario.id)
    const res  = await fetch(`${BASE_URL}/codigarios/${codigario.id}/items`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/abc/items`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/codigarios/[id]/items ──────────────────────────────────────────

describe("POST /api/codigarios/[id]/items", () => {
  it("crea un item", async () => {
    const codigario = await crearCodigario()
    const body      = buildItem()
    const res       = await fetch(`${BASE_URL}/codigarios/${codigario.id}/items`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.codigo).toBe(body.codigo)
    expect(data.nombre).toBe(body.nombre)
  })

  it("rechaza código duplicado en el mismo codigario (409)", async () => {
    const codigario = await crearCodigario()
    const item      = buildItem()
    await crearItem(codigario.id, item)
    const res = await fetch(`${BASE_URL}/codigarios/${codigario.id}/items`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(item),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza sin codigo (400)", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(`${BASE_URL}/codigarios/${codigario.id}/items`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ nombre: "Sin codigo" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin nombre (400)", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(`${BASE_URL}/codigarios/${codigario.id}/items`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ codigo: "SIN-NOMBRE" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza codigario inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/codigarios/999999/items`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildItem()),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(`${BASE_URL}/codigarios/${codigario.id}/items`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/codigarios/[id]/items/[itemId] ──────────────────────────────────

describe("GET /api/codigarios/[id]/items/[itemId]", () => {
  it("devuelve el item", async () => {
    const codigario = await crearCodigario()
    const item      = await crearItem(codigario.id)
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item.id}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(item.id)
  })

  it("devuelve 404 para item inexistente", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/999999`,
      { headers }
    )
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para itemId inválido", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/abc`,
      { headers }
    )
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /api/codigarios/[id]/items/[itemId] ────────────────────────────────

describe("PATCH /api/codigarios/[id]/items/[itemId]", () => {
  it("actualiza el nombre del item", async () => {
    const codigario = await crearCodigario()
    const item      = await crearItem(codigario.id)
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item.id}`,
      {
        method:  "PATCH",
        headers,
        body:    JSON.stringify({ nombre: "Nombre actualizado" }),
      }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.nombre).toBe("Nombre actualizado")
  })

  it("rechaza body vacío (400)", async () => {
    const codigario = await crearCodigario()
    const item      = await crearItem(codigario.id)
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item.id}`,
      { method: "PATCH", headers, body: JSON.stringify({}) }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza código duplicado (409)", async () => {
    const codigario = await crearCodigario()
    const item1     = await crearItem(codigario.id)
    const item2     = await crearItem(codigario.id)
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item2.id}`,
      {
        method:  "PATCH",
        headers,
        body:    JSON.stringify({ codigo: item1.codigo }),
      }
    )
    expect(res.status).toBe(409)
  })

  it("rechaza item inexistente (404)", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/999999`,
      { method: "PATCH", headers, body: JSON.stringify({ nombre: "test" }) }
    )
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const codigario = await crearCodigario()
    const item      = await crearItem(codigario.id)
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item.id}`,
      { method: "PATCH", headers, body: "esto no es json{{{" }
    )
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/codigarios/[id]/items/[itemId] ───────────────────────────────

describe("DELETE /api/codigarios/[id]/items/[itemId]", () => {
  it("elimina el item", async () => {
    const codigario = await crearCodigario()
    const item      = await crearItem(codigario.id)
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item.id}`,
      { method: "DELETE", headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("ya no aparece en GET después de eliminado", async () => {
    const codigario = await crearCodigario()
    const item      = await crearItem(codigario.id)
    await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item.id}`,
      { method: "DELETE", headers }
    )
    const res = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/${item.id}`,
      { headers }
    )
    expect(res.status).toBe(404)
  })

  it("devuelve ok:true deleted:false para item inexistente", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/999999`,
      { method: "DELETE", headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(false)
  })

  it("rechaza itemId inválido (400)", async () => {
    const codigario = await crearCodigario()
    const res       = await fetch(
      `${BASE_URL}/codigarios/${codigario.id}/items/abc`,
      { method: "DELETE", headers }
    )
    expect(res.status).toBe(400)
  })
})