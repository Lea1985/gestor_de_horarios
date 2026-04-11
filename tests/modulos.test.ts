// tests/modulos.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { cleanupModulo } from "./helpers/cleanup"

let headers: Record<string, string>
let moduloId: number | null = null

// Horas únicas para evitar solapamiento con datos del seed
const horaDesde = 1
const horaHasta = 2

beforeAll(async () => {
  // ✅ FIX CLAVE
  headers = await authHeaders("1")
})

afterAll(async () => {
  if (moduloId) await cleanupModulo(moduloId)
})

describe("POST /api/modulosHorarios", () => {
  it("crea un módulo nuevo", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dia_semana: "SABADO",
        hora_desde: horaDesde,
        hora_hasta: horaHasta,
      }),
    })

    // Puede ser 201 (nuevo) o 409 (ya existe)
    expect([201, 409]).toContain(res.status)

    const data = await res.json()

    if (res.status === 201) {
      moduloId = data.id
    } else {
      moduloId = data.modulo.id
    }

    expect(moduloId).toBeDefined()
  })

  it("rechaza sin campos obligatorios", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({ dia_semana: "LUNES" }),
    })

    expect(res.status).toBe(400)
  })

  it("rechaza hora_desde >= hora_hasta", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dia_semana: "LUNES",
        hora_desde: 10,
        hora_hasta: 5,
      }),
    })

    expect(res.status).toBe(400)
  })
})

describe("GET /api/modulosHorarios", () => {
  it("devuelve lista de módulos", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios`, { headers })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})

describe("GET /api/modulosHorarios/[id]", () => {
  it("devuelve el módulo creado", async () => {
    expect(moduloId).not.toBeNull() // ✅ evita cascada

    const res = await fetch(`${BASE_URL}/modulosHorarios/${moduloId}`, { headers })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.id).toBe(moduloId)
  })

  it("devuelve 404 para ID inexistente", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para ID inválido", async () => {
    const res = await fetch(`${BASE_URL}/modulosHorarios/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/modulosHorarios/[id]", () => {
  it("actualiza activo a false", async () => {
    expect(moduloId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/modulosHorarios/${moduloId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ activo: false }),
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.activo).toBe(false)
  })

  it("vuelve a activar el módulo", async () => {
    expect(moduloId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/modulosHorarios/${moduloId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ activo: true }),
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.activo).toBe(true)
  })
})

describe("DELETE /api/modulosHorarios/[id]", () => {
  it("hace soft delete del módulo", async () => {
    expect(moduloId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/modulosHorarios/${moduloId}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("es idempotente al borrar dos veces", async () => {
    expect(moduloId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/modulosHorarios/${moduloId}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.deleted).toBe(false)
  })
})