// tests/clases.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let asignacionId:  number
let moduloId:      number
let claseId:       number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  // Unidad
  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Clases Test" },
  })

  // Turno (requerido por Asignacion)
  const turno = await prisma.turno.create({
    data: { institucionId, nombre: "Mañana", horaInicio: 480, horaFin: 720 },
  })

  // Asignación (vacante — sin titular, no hace falta para estos tests)
  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      unidadId:                 unidad.id,
      turnoId:                  turno.id,
      identificadorEstructural: `CLASE-TEST-${randomUUID()}`,
      fecha_inicio:             new Date("2026-01-01"),
    },
  })
  asignacionId = asignacion.id

  // Módulo horario — DOMINGO para no chocar con días laborales
  const modulo = await prisma.moduloHorario.create({
    data: {
      institucionId,
      dia_semana: "DOMINGO",
      hora_desde: 480,
      hora_hasta: 520,
    },
  })
  moduloId = modulo.id

  // Distribución horaria
  const distribucion = await prisma.distribucionHoraria.create({
    data: {
      institucionId,
      asignacionId,
      version:              1,
      fecha_vigencia_desde: new Date("2026-01-01"),
    },
  })

  // Vincular módulo a distribución
  await prisma.distribucionModulo.create({
    data: { distribucionHorariaId: distribucion.id, moduloHorarioId: modulo.id },
  })

  // Clases de prueba sembradas directo. La generación real de ClaseProgramada
  // pasa por los "disparadores" (activarPeriodo, asignarModulos), no por un
  // endpoint manual -- POST /api/clases/generar nunca existió como ruta
  // (confirmado: no hay app/api/clases/generar/route.ts, y grep sobre
  // app/features/components no encuentra ningún consumidor). Probablemente
  // quedó planeado antes de que se implementara el motor de resolución.
  await prisma.claseProgramada.createMany({
    data: [
      { institucionId, asignacionId, moduloId, unidadId: unidad.id, fecha: new Date("2026-04-05T12:00:00.000Z"), estado: "PROGRAMADA" },
      { institucionId, asignacionId, moduloId, unidadId: unidad.id, fecha: new Date("2026-04-12T12:00:00.000Z"), estado: "PROGRAMADA" },
      { institucionId, asignacionId, moduloId, unidadId: unidad.id, fecha: new Date("2026-04-19T12:00:00.000Z"), estado: "PROGRAMADA" },
    ],
  })
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

// ─── GET /api/clases ───────────────────────────────────────────────────────────

describe("GET /api/clases", () => {
  it("devuelve clases filtradas por asignacionId", async () => {
    const res  = await fetch(
      `${BASE_URL}/clases?asignacionId=${asignacionId}&fecha_desde=2026-04-01&fecha_hasta=2026-04-30`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    claseId = data[0].id
  })

  it("devuelve clases filtradas por fecha_desde", async () => {
    const res  = await fetch(
      `${BASE_URL}/clases?fecha_desde=2026-04-01`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("filtra por estado", async () => {
    const res  = await fetch(
      `${BASE_URL}/clases?asignacionId=${asignacionId}&fecha_desde=2026-04-01&estado=PROGRAMADA`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    data.forEach((c: { estado: string }) => expect(c.estado).toBe("PROGRAMADA"))
  })

  it("rechaza estado inválido (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/clases?asignacionId=${asignacionId}&estado=INVALIDO`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin filtros (400)", async () => {
    const res = await fetch(`${BASE_URL}/clases`, { headers })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/clases?asignacionId=${asignacionId}`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/clases?asignacionId=${asignacionId}`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/clases/[id] ──────────────────────────────────────────────────────

describe("GET /api/clases/[id]", () => {
  it("devuelve la clase por id", async () => {
    const res  = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(claseId)
    expect(data).toHaveProperty("modulo")
    expect(data).toHaveProperty("unidad")
    expect(data).toHaveProperty("asignacion")
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/clases/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/clases/abc`, { headers })
    expect(res.status).toBe(400)
  })

  it("no devuelve clases de otro tenant", async () => {
    const otroTenant  = await createTestTenant()
    const otraUnidad  = await prisma.unidadOrganizativa.create({
      data: { institucionId: otroTenant.institucionId, codigoUnidad: 1, nombre: "Aula Otro" },
    })
    const otroTurno = await prisma.turno.create({
      data: { institucionId: otroTenant.institucionId, nombre: "Mañana", horaInicio: 480, horaFin: 720 },
    })
    const otraAsig = await prisma.asignacion.create({
      data: {
        institucionId:            otroTenant.institucionId,
        unidadId:                 otraUnidad.id,
        turnoId:                  otroTurno.id,
        identificadorEstructural: `OTRO-${randomUUID()}`,
        fecha_inicio:             new Date("2026-01-01"),
      },
    })
    const otroModulo = await prisma.moduloHorario.create({
      data: { institucionId: otroTenant.institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
    })
    const otraClase = await prisma.claseProgramada.create({
      data: {
        institucionId: otroTenant.institucionId,
        asignacionId:  otraAsig.id,
        moduloId:      otroModulo.id,
        unidadId:      otraUnidad.id,
        fecha:         new Date("2026-04-06"),
        estado:        "PROGRAMADA",
      },
    })

    const res = await fetch(`${BASE_URL}/clases/${otraClase.id}`, { headers })
    expect(res.status).toBe(404)

    await destroyInstitucion(otroTenant.institucionId)
  })
})

// ─── PATCH /api/clases/[id] ────────────────────────────────────────────────────

describe("PATCH /api/clases/[id]", () => {
  it("rechaza intento de setear estado — ya no es un campo soportado (400)", async () => {
    const res = await fetch(`${BASE_URL}/clases/${claseId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ estado: "DICTADA" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza body vacío (400)", async () => {
    const res = await fetch(`${BASE_URL}/clases/${claseId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/clases/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ incidenciaId: null }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/clases/abc`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ incidenciaId: null }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/clases/${claseId}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})