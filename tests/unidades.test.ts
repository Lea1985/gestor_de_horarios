// tests/unidades.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { cleanupUnidad } from "./helpers/cleanup"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

let headers: Record<string, string>
let unidadId: number

const TENANT_ID = "1"
const codigo = Date.now() % 1000000

beforeAll(async () => {
  headers = await authHeaders(TENANT_ID)

  // 🔥 limpiar unidad residual (misma institución/tenant)
  const prev = await prisma.unidadOrganizativa.findFirst({
    where: {
      institucionId: Number(TENANT_ID),
      codigoUnidad: codigo,
    },
  })

  if (prev) {
    await prisma.unidadOrganizativa.delete({
      where: { id: prev.id },
    })
  }
})

afterAll(async () => {
  if (unidadId) {
    await cleanupUnidad(unidadId)
  }

  await prisma.$disconnect() // 🔥 clave para que Vitest cierre bien
})

describe("POST /api/unidades", () => {
  it("crea una unidad nueva", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        codigoUnidad: codigo,
        nombre: `Aula Test ${codigo}`,
        tipo: "AULA",
      }),
    })

    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.codigoUnidad).toBe(codigo)

    unidadId = data.id
  })

  it("rechaza código duplicado en la misma institución", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        codigoUnidad: codigo,
        nombre: "Duplicada",
      }),
    })

    expect(res.status).toBe(409)
  })

  it("rechaza sin nombre", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        codigoUnidad: 99999,
      }),
    })

    expect(res.status).toBe(400)
  })
})

describe("GET /api/unidades", () => {
  it("devuelve lista de unidades", async () => {
    const res = await fetch(`${BASE_URL}/unidades`, { headers })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((u: any) => u.id === unidadId)).toBe(true)
  })
})

describe("GET /api/unidades/[id]", () => {
  it("devuelve la unidad creada", async () => {
    const res = await fetch(`${BASE_URL}/unidades/${unidadId}`, { headers })

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

describe("PATCH /api/unidades/[id]", () => {
  it("actualiza el nombre", async () => {
    const res = await fetch(`${BASE_URL}/unidades/${unidadId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        nombre: "Aula Actualizada",
      }),
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.nombre).toBe("Aula Actualizada")
  })

  it("rechaza body vacío", async () => {
    const res = await fetch(`${BASE_URL}/unidades/${unidadId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/unidades/[id]", () => {
  it("hace soft delete de la unidad", async () => {
    const res = await fetch(`${BASE_URL}/unidades/${unidadId}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("es idempotente al borrar dos veces", async () => {
    const res = await fetch(`${BASE_URL}/unidades/${unidadId}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.deleted).toBe(false)
  })
})