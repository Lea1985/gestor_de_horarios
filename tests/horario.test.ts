// tests/horario.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let asignacionId:  number
let unidadId:      number

const SEMANA_TEST = "2026-04-06" // lunes

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const agente = await createTestAgente(institucionId)

  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Horario Test" },
  })
  unidadId = unidad.id

  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `HOR-TEST-${randomUUID()}`,
      fecha_inicio:            new Date("2026-01-01"),
    },
  })
  asignacionId = asignacion.id

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
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

  // Lunes 6 de abril 2026 a mediodía UTC — sin drift de timezone
  await prisma.claseProgramada.create({
    data: {
      institucionId,
      asignacionId,
      moduloId: modulo.id,
      unidadId: unidad.id,
      fecha:    new Date("2026-04-06T12:00:00.000Z"),
      estado:   "PROGRAMADA",
    },
  })
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

// ─── GET /api/horario ─────────────────────────────────────────────────────────

describe("GET /api/horario", () => {
  it("devuelve grilla semanal por asignación", async () => {
    const res  = await fetch(
      `${BASE_URL}/horario?semana=${SEMANA_TEST}&asignacionId=${asignacionId}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("semana")
    expect(data).toHaveProperty("grilla")
    expect(data.semana).toHaveProperty("lunes")
    expect(data.semana).toHaveProperty("domingo")
    expect(data.grilla).toHaveProperty("LUNES")
    expect(Array.isArray(data.grilla.LUNES)).toBe(true)
    expect(data.grilla.LUNES.length).toBeGreaterThan(0)
  })

  it("devuelve grilla semanal por unidadId", async () => {
    const res  = await fetch(
      `${BASE_URL}/horario?semana=${SEMANA_TEST}&unidadId=${unidadId}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("grilla")
    expect(Array.isArray(data.grilla.LUNES)).toBe(true)
    expect(data.grilla.LUNES.length).toBeGreaterThan(0)
  })

  it("días sin clases devuelven array vacío", async () => {
    const res  = await fetch(
      `${BASE_URL}/horario?semana=${SEMANA_TEST}&asignacionId=${asignacionId}`,
      { headers }
    )
    const data = await res.json()
    expect(Array.isArray(data.grilla.MARTES)).toBe(true)
    expect(data.grilla.MARTES).toHaveLength(0)
  })

  it("rechaza sin semana (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/horario?asignacionId=${asignacionId}`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin filtro (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/horario?semana=${SEMANA_TEST}`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/horario?semana=${SEMANA_TEST}&asignacionId=${asignacionId}`
    )
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/horario?semana=${SEMANA_TEST}&asignacionId=${asignacionId}`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/horario/institucion ─────────────────────────────────────────────

describe("GET /api/horario/institucion", () => {
  it("devuelve horario completo de la institución agrupado por unidad", async () => {
    const res  = await fetch(
      `${BASE_URL}/horario/institucion?semana=${SEMANA_TEST}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("semana")
    expect(data).toHaveProperty("total")
    expect(data).toHaveProperty("unidades")
    expect(Array.isArray(data.unidades)).toBe(true)
    expect(data.total).toBeGreaterThan(0)
  })

  it("cada unidad tiene grilla con días", async () => {
    const res  = await fetch(
      `${BASE_URL}/horario/institucion?semana=${SEMANA_TEST}`,
      { headers }
    )
    const data = await res.json()
    const unidad = data.unidades[0]
    expect(unidad).toHaveProperty("unidad")
    expect(unidad).toHaveProperty("grilla")
    expect(unidad.grilla).toHaveProperty("LUNES")
    expect(unidad.grilla).toHaveProperty("MARTES")
    expect(Array.isArray(unidad.grilla.LUNES)).toBe(true)
    expect(unidad.grilla.LUNES.length).toBeGreaterThan(0)
  })

  it("semana sin clases devuelve total 0", async () => {
    const res  = await fetch(
      `${BASE_URL}/horario/institucion?semana=2020-01-06`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.total).toBe(0)
    expect(data.unidades).toHaveLength(0)
  })

  it("rechaza sin semana (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/horario/institucion`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/horario/institucion?semana=${SEMANA_TEST}`
    )
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/horario/institucion?semana=${SEMANA_TEST}`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })
})