// tests/distribuciones.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let asignacionId:  number
let moduloId:      number
let codigoUnidadCounter = 0

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const agente = await createTestAgente(institucionId)
  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: ++codigoUnidadCounter, nombre: "Aula Dist Test" },
  })

  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `DIST-TEST-${randomUUID()}`,
      fecha_inicio:            new Date("2026-01-01"),
    },
  })
  asignacionId = asignacion.id

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "DOMINGO", hora_desde: 480, hora_hasta: 520 },
  })
  moduloId = modulo.id
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

// Crea una asignación fresca para tests que necesitan distribuciones independientes
async function crearAsignacionFresca() {
  const agente = await createTestAgente(institucionId)
  const unidad = await prisma.unidadOrganizativa.create({
    data: {
      institucionId,
      codigoUnidad: ++codigoUnidadCounter,
      nombre:       `Aula-${codigoUnidadCounter}`,
    },
  })
  return prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `DIST-FRESH-${randomUUID()}`,
      fecha_inicio:            new Date("2026-01-01"),
    },
  })
}

async function crearDistribucion(asigId: number, version: number, overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/distribuciones`, {
    method:  "POST",
    headers,
    body:    JSON.stringify({
      asignacionId:         asigId,
      version,
      fecha_vigencia_desde: "2026-01-01",
      ...overrides,
    }),
  })
  if (res.status !== 201) throw new Error(`Error creando distribución: ${res.status}`)
  return res.json()
}

// ─── GET /api/distribuciones ───────────────────────────────────────────────────

describe("GET /api/distribuciones", () => {
  it("devuelve lista de distribuciones", async () => {
    const res  = await fetch(`${BASE_URL}/distribuciones`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/distribuciones ──────────────────────────────────────────────────

describe("POST /api/distribuciones", () => {
  it("crea una distribución", async () => {
    const asig = await crearAsignacionFresca()
    const dist = await crearDistribucion(asig.id, 1)
    expect(dist).toHaveProperty("id")
    expect(dist.asignacionId).toBe(asig.id)
    expect(dist.version).toBe(1)
  })

  it("rechaza versión duplicada (409)", async () => {
    const asig = await crearAsignacionFresca()
    await crearDistribucion(asig.id, 1)
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId:         asig.id,
        version:              1,
        fecha_vigencia_desde: "2026-06-01",
      }),
    })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/versión/i)
  })

  it("rechaza solapamiento de fechas (409)", async () => {
    const asig = await crearAsignacionFresca()
    await crearDistribucion(asig.id, 1)
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId:         asig.id,
        version:              2,
        fecha_vigencia_desde: "2026-03-01",
      }),
    })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/distribución activa/i)
  })

  it("rechaza sin asignacionId (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ version: 1, fecha_vigencia_desde: "2026-01-01" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin version (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ asignacionId, fecha_vigencia_desde: "2026-01-01" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin fecha_vigencia_desde (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ asignacionId, version: 99 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza asignación inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ asignacionId: 999999, version: 1, fecha_vigencia_desde: "2026-01-01" }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza fecha_vigencia_desde inválida (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ asignacionId, version: 99, fecha_vigencia_desde: "no-es-fecha" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza rango inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId,
        version:              99,
        fecha_vigencia_desde: "2026-12-31",
        fecha_vigencia_hasta: "2026-01-01",
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ asignacionId, version: 1, fecha_vigencia_desde: "2026-01-01" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify({ asignacionId, version: 1, fecha_vigencia_desde: "2026-01-01" }),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/distribuciones/[id] ─────────────────────────────────────────────

describe("GET /api/distribuciones/[id]", () => {
  it("devuelve la distribución con módulos", async () => {
    const asig  = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(creada.id)
    expect(data).toHaveProperty("distribucionModulos")
    expect(data).toHaveProperty("asignacion")
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /api/distribuciones/[id] ───────────────────────────────────────────

describe("PATCH /api/distribuciones/[id]", () => {
  it("actualiza la fecha_vigencia_hasta", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_vigencia_hasta: "2026-12-31" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.fecha_vigencia_hasta).not.toBeNull()
  })

  it("actualiza el estado", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ estado: "INACTIVO" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.estado).toBe("INACTIVO")
  })

  it("rechaza body vacío (400)", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ estado: "INACTIVO" }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/distribuciones/[id]/modulos ─────────────────────────────────────

describe("POST /api/distribuciones/[id]/modulos", () => {
  it("asigna módulos a la distribución", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ modulos: [moduloId] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.total).toBe(1)
    expect(data.data[0].moduloHorarioId).toBe(moduloId)
  })

  it("es idempotente — reemplaza módulos existentes", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)

    await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method: "POST", headers,
      body:   JSON.stringify({ modulos: [moduloId] }),
    })

    const res  = await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method: "POST", headers,
      body:   JSON.stringify({ modulos: [moduloId] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.total).toBe(1)
  })

  it("array vacío limpia los módulos", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)

    await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method: "POST", headers,
      body:   JSON.stringify({ modulos: [moduloId] }),
    })

    const res  = await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method: "POST", headers,
      body:   JSON.stringify({ modulos: [] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.total).toBe(0)
  })

  it("rechaza módulo de otro tenant (400)", async () => {
    const otroTenant = await createTestTenant()
    const otroModulo = await prisma.moduloHorario.create({
      data: { institucionId: otroTenant.institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
    })

    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method: "POST", headers,
      body:   JSON.stringify({ modulos: [otroModulo.id] }),
    })
    expect(res.status).toBe(400)

    await destroyInstitucion(otroTenant.institucionId)
  })

  it("rechaza formato inválido (400)", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method: "POST", headers,
      body:   JSON.stringify({ modulos: "no-es-array" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza distribución inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones/999999/modulos`, {
      method: "POST", headers,
      body:   JSON.stringify({ modulos: [moduloId] }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}/modulos`, {
      method: "POST", headers,
      body:   "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/distribuciones/[id] ──────────────────────────────────────────

describe("DELETE /api/distribuciones/[id]", () => {
  it("soft delete de la distribución", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    const res    = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("ya no aparece en GET después de eliminada", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    await fetch(`${BASE_URL}/distribuciones/${creada.id}`, { method: "DELETE", headers })
    const res = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, { headers })
    expect(res.status).toBe(404)
  })

  it("es idempotente — devuelve deleted:false la segunda vez", async () => {
    const asig   = await crearAsignacionFresca()
    const creada = await crearDistribucion(asig.id, 1)
    await fetch(`${BASE_URL}/distribuciones/${creada.id}`, { method: "DELETE", headers })
    const res  = await fetch(`${BASE_URL}/distribuciones/${creada.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("devuelve deleted:false para id inexistente", async () => {
    const res  = await fetch(`${BASE_URL}/distribuciones/999999`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones/abc`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(400)
  })
})