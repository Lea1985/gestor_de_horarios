// tests/multiTenant.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion } from "./helpers/factories"
import { randomUUID } from "crypto"

let tenant1Id:      number
let tenant2Id:      number
let headers1:       Record<string, string>
let headers2:       Record<string, string>
let token1:         string

beforeAll(async () => {
  const t1 = await createTestTenant()
  const t2 = await createTestTenant()

  tenant1Id = t1.institucionId
  tenant2Id = t2.institucionId
  token1    = t1.token
  headers1  = authHeaders(String(tenant1Id), t1.token)
  headers2  = authHeaders(String(tenant2Id), t2.token)
})

afterAll(async () => {
  await destroyInstitucion(tenant1Id)
  await destroyInstitucion(tenant2Id)
})

describe("Multi-tenant isolation", () => {
  it("no permite acceder a datos de otro tenant", async () => {
    // Crear agente en tenant 1
    const documento = `DOC-${randomUUID()}`
    const res = await fetch(`${BASE_URL}/agentes`, {
      method:  "POST",
      headers: headers1,
      body:    JSON.stringify({
        nombre:    "Agente MultiTenant",
        apellido:  "Test",
        documento,
      }),
    })
    expect(res.status).toBe(201)

    // Aparece en tenant 1
    const list1 = await fetch(`${BASE_URL}/agentes`, { headers: headers1 })
    expect(list1.status).toBe(200)
    const data1 = await list1.json()
    expect(Array.isArray(data1)).toBe(true)
    const encontradoEn1 = data1.some((a: { documento: string }) => a.documento === documento)
    expect(encontradoEn1).toBe(true)

    // No aparece en tenant 2
    const list2 = await fetch(`${BASE_URL}/agentes`, { headers: headers2 })
    expect(list2.status).toBe(200)
    const data2 = await list2.json()
    const encontradoEn2 = data2.some((a: { documento: string }) => a.documento === documento)
    expect(encontradoEn2).toBe(false)
  })

  it("bloquea si el token pertenece a otro tenant (403)", async () => {
    // Token de tenant1 pero x-tenant-id de tenant2
    const res = await fetch(`${BASE_URL}/agentes`, {
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token1}`,
        "x-tenant-id":   String(tenant2Id),
      },
    })
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("No autorizado para este tenant")
  })
})