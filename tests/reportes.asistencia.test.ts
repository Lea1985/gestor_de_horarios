// tests/reportes.asistencia.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let asignacionId:  number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const agente = await createTestAgente(institucionId)
  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Reporte Test" },
  })

  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `REP-ASIST-${randomUUID()}`,
      fecha_inicio:            new Date("2024-01-01"),
    },
  })
  asignacionId = asignacion.id

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 540 },
  })

  await prisma.claseProgramada.createMany({
    data: [
      {
        institucionId,
        asignacionId,
        unidadId: unidad.id,
        moduloId: modulo.id,
        fecha:    new Date("2024-01-01T12:00:00.000Z"),
        estado:   "PROGRAMADA",
      },
      {
        institucionId,
        asignacionId,
        unidadId: unidad.id,
        moduloId: modulo.id,
        fecha:    new Date("2024-01-02T12:00:00.000Z"),
        estado:   "DICTADA",
      },
      {
        institucionId,
        asignacionId,
        unidadId: unidad.id,
        moduloId: modulo.id,
        fecha:    new Date("2024-01-03T12:00:00.000Z"),
        estado:   "SUSPENDIDA",
      },
    ],
  })
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

describe("GET /api/reportes/asistencia", () => {
  it("devuelve resumen correcto", async () => {
    const res  = await fetch(
      `${BASE_URL}/reportes/asistencia?asignacionId=${asignacionId}&desde=2024-01-01&hasta=2024-01-10`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.resumen.total).toBe(3)
    expect(data.clases.length).toBe(3)
    expect(data.resumen.programadas).toBe(1)
    expect(data.resumen.dictadas).toBe(1)
    expect(data.resumen.suspendidas).toBe(1)
  })

  it("rechaza sin params (400)", async () => {
    const res = await fetch(`${BASE_URL}/reportes/asistencia`, { headers })
    expect(res.status).toBe(400)
  })

  it("rechaza sin asignacionId (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/asistencia?desde=2024-01-01&hasta=2024-01-10`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/asistencia?asignacionId=${asignacionId}&desde=2024-01-01&hasta=2024-01-10`
    )
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/asistencia?asignacionId=${asignacionId}&desde=2024-01-01&hasta=2024-01-10`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })

  it("rango sin clases devuelve total 0", async () => {
    const res  = await fetch(
      `${BASE_URL}/reportes/asistencia?asignacionId=${asignacionId}&desde=2020-01-01&hasta=2020-01-31`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.resumen.total).toBe(0)
    expect(data.clases.length).toBe(0)
  })
})