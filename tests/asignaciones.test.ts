// tests/asignaciones.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:      Record<string, string>
let institucionId: number
let agenteId:      number
let unidadId:      number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  // Agente vinculado al tenant
  const agente = await createTestAgente(institucionId)
  agenteId = agente.id

  // Unidad organizativa
  const unidad = await prisma.unidadOrganizativa.create({
    data: {
      institucionId,
      codigoUnidad: 1,
      nombre:       "Aula Test",
    },
  })
  unidadId = unidad.id
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

function buildAsignacion(overrides?: Record<string, unknown>) {
  return {
    agenteId,
    unidadId,
    identificadorEstructural: `ID-${randomUUID()}`,
    fecha_inicio:             "2025-03-01",
    ...overrides,
  }
}

async function crearAsignacion(overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/asignaciones`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildAsignacion(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando asignación: ${res.status}`)
  return res.json()
}

describe("GET /api/asignaciones", () => {
  it("devuelve lista de asignaciones", async () => {
    const res  = await fetch(`${BASE_URL}/asignaciones`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

describe("POST /api/asignaciones", () => {
  it("crea una asignación con datos mínimos", async () => {
    const body = buildAsignacion()
    const res  = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.identificadorEstructural).toBe(body.identificadorEstructural)
    expect(data.agente.id).toBe(agenteId)
    expect(data.unidad.id).toBe(unidadId)
  })

  it("crea una asignación con fecha_fin", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildAsignacion({ fecha_fin: "2025-12-31" })),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.fecha_fin).not.toBeNull()
  })

  it("rechaza identificadorEstructural duplicado (409)", async () => {
    const body = buildAsignacion()
    await crearAsignacion(body)
    const res  = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza sin agenteId (400)", async () => {
    const { agenteId: _, ...sinAgente } = buildAsignacion()
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinAgente),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin unidadId (400)", async () => {
    const { unidadId: _, ...sinUnidad } = buildAsignacion()
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinUnidad),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin identificadorEstructural (400)", async () => {
    const { identificadorEstructural: _, ...sinId } = buildAsignacion()
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinId),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin fecha_inicio (400)", async () => {
    const { fecha_inicio: _, ...sinFecha } = buildAsignacion()
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinFecha),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza agente inexistente en el tenant (404)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildAsignacion({ agenteId: 999999 })),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza unidad inexistente en el tenant (404)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildAsignacion({ unidadId: 999999 })),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildAsignacion()),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id":  String(institucionId),
      },
      body: JSON.stringify(buildAsignacion()),
    })
    expect(res.status).toBe(401)
  })
})

describe("GET /api/asignaciones/[id]", () => {
  it("devuelve la asignación por id", async () => {
    const creada = await crearAsignacion()
    const res    = await fetch(`${BASE_URL}/asignaciones/${creada.id}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(creada.id)
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones/abc`, { headers })
    expect(res.status).toBe(400)
  })

  it("no devuelve asignaciones de otro tenant", async () => {
    // Crear otra institución con su propia asignación
    const otroTenant  = await createTestTenant()
    const otroAgente  = await createTestAgente(otroTenant.institucionId)
    const otraUnidad  = await prisma.unidadOrganizativa.create({
      data: {
        institucionId: otroTenant.institucionId,
        codigoUnidad:  1,
        nombre:        "Aula Otro Tenant",
      },
    })
    const otraAsig = await prisma.asignacion.create({
      data: {
        institucionId:            otroTenant.institucionId,
        agenteId:                 otroAgente.id,
        unidadId:                 otraUnidad.id,
        identificadorEstructural: `ID-${randomUUID()}`,
        fecha_inicio:             new Date("2025-03-01"),
      },
    })

    const res = await fetch(`${BASE_URL}/asignaciones/${otraAsig.id}`, { headers })
    expect(res.status).toBe(404)

    await destroyInstitucion(otroTenant.institucionId)
  })
})

describe("PATCH /api/asignaciones/[id]", () => {
  it("actualiza el identificadorEstructural", async () => {
    const creada  = await crearAsignacion()
    const nuevoId = `ID-${randomUUID()}`
    const res     = await fetch(`${BASE_URL}/asignaciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ identificadorEstructural: nuevoId }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.identificadorEstructural).toBe(nuevoId)
  })

  it("actualiza la fecha_fin", async () => {
    const creada = await crearAsignacion()
    const res    = await fetch(`${BASE_URL}/asignaciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_fin: "2025-12-31" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.fecha_fin).not.toBeNull()
  })

  it("rechaza body vacío (400)", async () => {
    const creada = await crearAsignacion()
    const res    = await fetch(`${BASE_URL}/asignaciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ identificadorEstructural: `ID-${randomUUID()}` }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones/abc`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ identificadorEstructural: `ID-${randomUUID()}` }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza identificadorEstructural duplicado (409)", async () => {
    const primera  = await crearAsignacion()
    const segunda  = await crearAsignacion()
    const res      = await fetch(`${BASE_URL}/asignaciones/${segunda.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ identificadorEstructural: primera.identificadorEstructural }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza JSON inválido (400)", async () => {
    const creada = await crearAsignacion()
    const res    = await fetch(`${BASE_URL}/asignaciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/asignaciones/[id]", () => {
  it("elimina (soft delete) la asignación", async () => {
    const creada = await crearAsignacion()
    const res    = await fetch(`${BASE_URL}/asignaciones/${creada.id}`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("ya no aparece en GET después de eliminada", async () => {
    const creada = await crearAsignacion()
    await fetch(`${BASE_URL}/asignaciones/${creada.id}`, {
      method:  "DELETE",
      headers,
    })
    const res = await fetch(`${BASE_URL}/asignaciones/${creada.id}`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve ok:true deleted:false para id inexistente", async () => {
    const res  = await fetch(`${BASE_URL}/asignaciones/999999`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(false)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones/abc`, {
      method:  "DELETE",
      headers,
    })
    expect(res.status).toBe(400)
  })
})