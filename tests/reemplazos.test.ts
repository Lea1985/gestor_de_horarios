// tests/reemplazos.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:         Record<string, string>
let institucionId:   number
let asignacionId:    number
let asigSuplenteId:  number
let claseId:         number
let reemplazoId:     number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const agenteTitular  = await createTestAgente(institucionId)
  const agenteSuplente = await createTestAgente(institucionId)

  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Reemp Test" },
  })

  const asignacionTitular = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agenteTitular.id,
      unidadId:                unidad.id,
      identificadorEstructural: `REEMP-TIT-${randomUUID()}`,
      fecha_inicio:            new Date("2026-01-01"),
    },
  })
  asignacionId = asignacionTitular.id

  const asignacionSuplente = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agenteSuplente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `REEMP-SUP-${randomUUID()}`,
      fecha_inicio:            new Date("2026-01-01"),
    },
  })
  asigSuplenteId = asignacionSuplente.id

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "DOMINGO", hora_desde: 480, hora_hasta: 520 },
  })

  const distribucion = await prisma.distribucionHoraria.create({
    data: {
      institucionId,
      asignacionId,
      version:              1,
      fecha_vigencia_desde: new Date("2026-01-01"),
    },
  })

  await prisma.distribucionModulo.create({
    data: { distribucionHorariaId: distribucion.id, moduloHorarioId: modulo.id },
  })

  // Crear clase directamente — mediodía UTC para evitar drift de timezone
  const clase = await prisma.claseProgramada.create({
    data: {
      institucionId,
      asignacionId,
      moduloId: modulo.id,
      unidadId: unidad.id,
      fecha:    new Date("2026-04-05T12:00:00.000Z"), // domingo
      estado:   "PROGRAMADA",
    },
  })
  claseId = clase.id
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

// ─── POST /api/reemplazos ─────────────────────────────────────────────────────

describe("POST /api/reemplazos", () => {
  it("crea un reemplazo y marca la clase como REEMPLAZADA", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        observacion:          "Test reemplazo",
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.claseId).toBe(claseId)
    reemplazoId = data.id

    // verificar que la clase quedó REEMPLAZADA
    const claseRes = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })
    const clase    = await claseRes.json()
    expect(clase.estado).toBe("REEMPLAZADA")
  })

  it("rechaza duplicado (409)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
      }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza titular igual a suplente (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asignacionId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin claseId (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin asignacionTitularId (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionSuplenteId: asigSuplenteId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin asignacionSuplenteId (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionTitularId: asignacionId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza clase inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId:              999999,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
      }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
      }),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/reemplazos ──────────────────────────────────────────────────────

describe("GET /api/reemplazos", () => {
  it("filtra por claseId", async () => {
    const res  = await fetch(`${BASE_URL}/reemplazos?claseId=${claseId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((r: { id: number }) => r.id === reemplazoId)).toBe(true)
  })

  it("rechaza sin filtros (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, { headers })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos?claseId=${claseId}`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos?claseId=${claseId}`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/reemplazos/[id] ─────────────────────────────────────────────────

describe("GET /api/reemplazos/[id]", () => {
  it("devuelve el reemplazo por id", async () => {
    const res  = await fetch(`${BASE_URL}/reemplazos/${reemplazoId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(reemplazoId)
    expect(data.claseId).toBe(claseId)
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/reemplazos/[id] ──────────────────────────────────────────────

describe("DELETE /api/reemplazos/[id]", () => {
  it("soft delete y revierte estado de la clase a PROGRAMADA", async () => {
    const res  = await fetch(`${BASE_URL}/reemplazos/${reemplazoId}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(true)

    // verificar que la clase volvió a PROGRAMADA
    const claseRes = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })
    const clase    = await claseRes.json()
    expect(clase.estado).toBe("PROGRAMADA")
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/999999`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/abc`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(400)
  })
})