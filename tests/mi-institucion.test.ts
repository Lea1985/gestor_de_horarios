// tests/mi-institucion.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion } from "./helpers/factories"

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

describe("GET /api/mi-institucion", () => {
  it("devuelve la institución del tenant", async () => {
    const res  = await fetch(`${BASE_URL}/mi-institucion`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(institucionId)
    expect(data).toHaveProperty("nombre")
    expect(data).toHaveProperty("dominio")
    expect(data).toHaveProperty("estado")
    expect(data).toHaveProperty("createdAt")
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

describe("PATCH /api/mi-institucion", () => {
  it("actualiza el nombre", async () => {
    const nuevoNombre = "Nombre Actualizado Test"
    const res         = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ nombre: nuevoNombre }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.nombre).toBe(nuevoNombre)
  })

  it("actualiza el email", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ email: "nuevo@test.dev" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.email).toBe("nuevo@test.dev")
  })

  it("actualiza múltiples campos a la vez", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ telefono: "0341-999999", domicilio: "Calle Falsa 123" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.telefono).toBe("0341-999999")
    expect(data.domicilio).toBe("Calle Falsa 123")
  })

  it("rechaza body vacío (400)", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza email inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ email: "no-es-un-email" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ nombre: "test" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/mi-institucion`, {
      method:  "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id":  String(institucionId),
      },
      body: JSON.stringify({ nombre: "test" }),
    })
    expect(res.status).toBe(401)
  })
})