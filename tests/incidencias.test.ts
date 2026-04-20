// tests/incidencias.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let asignacionId:  number
let itemId:        number
let incidenciaId:  number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const agente = await createTestAgente(institucionId)
  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Incid Test" },
  })

  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `INCID-TEST-${randomUUID()}`,
      fecha_inicio:            new Date("2026-01-01"),
    },
  })
  asignacionId = asignacion.id

  const codigario = await prisma.codigario.create({
    data: { institucionId, nombre: `COD-INCID-${randomUUID().slice(0, 8).toUpperCase()}` },
  })

  const item = await prisma.codigarioItem.create({
    data: {
      codigarioId: codigario.id,
      codigo:      `ENF-${randomUUID().slice(0, 6)}`,
      nombre:      "Enfermedad test",
    },
  })
  itemId = item.id
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

function buildIncidencia(overrides?: Record<string, unknown>) {
  return {
    asignacionId,
    codigarioItemId: itemId,
    fecha_desde:     "2026-04-01",
    fecha_hasta:     "2026-04-03",
    observacion:     "Test incidencia",
    ...overrides,
  }
}

async function crearIncidencia(overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/incidencias`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildIncidencia(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando incidencia: ${res.status}`)
  return res.json()
}

// ─── GET /api/incidencias ─────────────────────────────────────────────────────

describe("GET /api/incidencias", () => {
  it("devuelve lista de incidencias", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("filtra por asignacionId", async () => {
    const res  = await fetch(
      `${BASE_URL}/incidencias?asignacionId=${asignacionId}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/incidencias ────────────────────────────────────────────────────

describe("POST /api/incidencias", () => {
  it("crea una incidencia", async () => {
    const inc = await crearIncidencia()
    expect(inc.asignacionId).toBe(asignacionId)
    expect(inc).toHaveProperty("id")
    incidenciaId = inc.id
  })

  it("rechaza superposición de fechas (409)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        fecha_desde: "2026-04-02",
        fecha_hasta: "2026-04-05",
      })),
    })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data).toHaveProperty("conflicto")
  })

  it("rechaza rango de fechas inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        fecha_desde: "2026-05-10",
        fecha_hasta: "2026-05-01",
      })),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin asignacionId (400)", async () => {
    const { asignacionId: _, ...sinAsig } = buildIncidencia()
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinAsig),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin codigarioItemId (400)", async () => {
    const { codigarioItemId: _, ...sinItem } = buildIncidencia()
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinItem),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin fecha_desde (400)", async () => {
    const { fecha_desde: _, ...sinFecha } = buildIncidencia()
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinFecha),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza asignación inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        asignacionId: 999999,
        fecha_desde:  "2026-06-01",
        fecha_hasta:  "2026-06-03",
      })),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza codigarioItem inexistente (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        codigarioItemId: 999999,
        fecha_desde:     "2026-06-01",
        fecha_hasta:     "2026-06-03",
      })),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildIncidencia({ fecha_desde: "2026-07-01", fecha_hasta: "2026-07-03" })),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify(buildIncidencia({ fecha_desde: "2026-07-01", fecha_hasta: "2026-07-03" })),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/incidencias/asignacion/[id] ─────────────────────────────────────

describe("GET /api/incidencias/asignacion/[id]", () => {
  it("devuelve incidencias de la asignación", async () => {
    const res  = await fetch(
      `${BASE_URL}/incidencias/asignacion/${asignacionId}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.every((i: { asignacionId: number }) => i.asignacionId === asignacionId)).toBe(true)
  })

  it("devuelve 404 para asignación inexistente", async () => {
    const res = await fetch(
      `${BASE_URL}/incidencias/asignacion/999999`,
      { headers }
    )
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(
      `${BASE_URL}/incidencias/asignacion/abc`,
      { headers }
    )
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/incidencias/validar-superposicion ──────────────────────────────

describe("POST /api/incidencias/validar-superposicion", () => {
  it("devuelve tieneSuperposicion:false si no hay conflicto", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId,
        fecha_desde: "2026-10-01",
        fecha_hasta: "2026-10-05",
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tieneSuperposicion).toBe(false)
    expect(data.conflicto).toBeNull()
  })

  it("devuelve tieneSuperposicion:true si hay conflicto", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId,
        fecha_desde: "2026-04-02",
        fecha_hasta: "2026-04-04",
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tieneSuperposicion).toBe(true)
    expect(data.conflicto).not.toBeNull()
    expect(data.conflicto).toHaveProperty("id")
  })

  it("excluye la incidencia indicada en excludeId", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId,
        fecha_desde: "2026-04-01",
        fecha_hasta: "2026-04-03",
        excludeId:   incidenciaId,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tieneSuperposicion).toBe(false)
  })

  it("rechaza sin asignacionId (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-04-01", fecha_hasta: "2026-04-03" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza asignación inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId: 999999,
        fecha_desde:  "2026-04-01",
        fecha_hasta:  "2026-04-03",
      }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/incidencias/[id] ────────────────────────────────────────────────

describe("GET /api/incidencias/[id]", () => {
  it("devuelve la incidencia por id", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(incidenciaId)
    expect(data).toHaveProperty("codigarioItem")
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /api/incidencias/[id] ─────────────────────────────────────────────

describe("PATCH /api/incidencias/[id]", () => {
  it("actualiza la observacion", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ observacion: "Observación actualizada" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.observacion).toBe("Observación actualizada")
  })

  it("actualiza las fechas", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-04-01", fecha_hasta: "2026-04-02" }),
    })
    expect(res.status).toBe(200)
  })

  it("rechaza rango inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-04-10", fecha_hasta: "2026-04-01" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza superposición (409)", async () => {
    const segunda = await crearIncidencia({
      fecha_desde: "2026-05-01",
      fecha_hasta: "2026-05-05",
    })
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-04-30", fecha_hasta: "2026-05-03" }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ observacion: "test" }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/incidencias/[id]/cadena ─────────────────────────────────────────

describe("GET /api/incidencias/[id]/cadena", () => {
  it("devuelve la cadena de incidencias", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/${incidenciaId}/cadena`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/999999/cadena`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/abc/cadena`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/incidencias/[id] ────────────────────────────────────────────

describe("DELETE /api/incidencias/[id]", () => {
  it("elimina la incidencia", async () => {
    const inc = await crearIncidencia({
      fecha_desde: "2026-08-01",
      fecha_hasta: "2026-08-03",
    })
    const res = await fetch(`${BASE_URL}/incidencias/${inc.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("es idempotente — deleted:false la segunda vez", async () => {
    const inc = await crearIncidencia({
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-03",
    })
    await fetch(`${BASE_URL}/incidencias/${inc.id}`, { method: "DELETE", headers })
    const res  = await fetch(`${BASE_URL}/incidencias/${inc.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("devuelve deleted:false para id inexistente", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/999999`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/abc`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(400)
  })
})