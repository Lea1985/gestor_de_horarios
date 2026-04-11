import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { cleanupCodigario } from "./helpers/cleanup"

let headers: Record<string, string>
let codigarioId: number | null = null
let itemId: number | null = null

// 🔥 ID único real
const unique = `${Date.now()}_${Math.random()}`
const nombre = `COD_TEST_${unique}`
const itemCodigo = `TST_${unique}`

beforeAll(async () => {
  headers = await authHeaders("1")
})

afterAll(async () => {
  if (codigarioId) await cleanupCodigario(codigarioId)
})

describe("POST /api/codigarios", () => {
  it("crea un codigario", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nombre, descripcion: "Test" }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()

    expect(data.nombre).toBe(nombre.toUpperCase())
    codigarioId = data.id
  })

  it("rechaza nombre duplicado", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nombre }),
    })

    expect(res.status).toBe(409)
  })

  it("rechaza sin nombre", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({ descripcion: "Sin nombre" }),
    })

    expect(res.status).toBe(400)
  })
})

describe("GET /api/codigarios", () => {
  it("devuelve lista", async () => {
    const res = await fetch(`${BASE_URL}/codigarios`, { headers })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((c: any) => c.id === codigarioId)).toBe(true)
  })
})

describe("POST /api/codigarios/[id]/items", () => {
  it("crea un item", async () => {
    expect(codigarioId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        codigo: itemCodigo,
        nombre: "Item Test",
      }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()

    expect(data.codigo).toBe(itemCodigo)
    itemId = data.id
  })

  it("rechaza duplicado", async () => {
    expect(codigarioId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        codigo: itemCodigo,
        nombre: "Duplicado",
      }),
    })

    expect(res.status).toBe(409)
  })
})

describe("GET /items", () => {
  it("devuelve items", async () => {
    expect(codigarioId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items`, { headers })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(Array.isArray(data)).toBe(true)
    expect(itemId).not.toBeNull()
    expect(data.some((i: any) => i.id === itemId)).toBe(true)
  })
})

describe("PATCH /items", () => {
  it("actualiza item", async () => {
    expect(codigarioId).not.toBeNull()
    expect(itemId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items/${itemId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ nombre: "Item Actualizado" }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.nombre).toBe("Item Actualizado")
  })
})

describe("DELETE /items", () => {
  it("soft delete", async () => {
    expect(codigarioId).not.toBeNull()
    expect(itemId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items/${itemId}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.deleted).toBe(true)
  })

  it("idempotente", async () => {
    expect(codigarioId).not.toBeNull()
    expect(itemId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items/${itemId}`, {
      method: "DELETE",
      headers,
    })

    const data = await res.json()
    expect(data.deleted).toBe(false)
  })
})

describe("DELETE /codigario", () => {
  it("soft delete codigario", async () => {
    expect(codigarioId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/codigarios/${codigarioId}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.ok).toBe(true)
  })
})