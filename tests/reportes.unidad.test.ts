// tests/reportes.unidad.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let unidadId:      number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const agente = await createTestAgente(institucionId)

  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Reporte Unidad Test" },
  })
  unidadId = unidad.id

  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `REP-UNIDAD-${randomUUID()}`,
      fecha_inicio:            new Date("2024-01-01"),
    },
  })

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 540 },
  })

  await prisma.claseProgramada.createMany({
    data: [
      {
        institucionId,
        asignacionId: asignacion.id,
        unidadId:     unidad.id,
        moduloId:     modulo.id,
        fecha:        new Date("2024-01-01T12:00:00.000Z"),
        estado:       "PROGRAMADA",
      },
      {
        institucionId,
        asignacionId: asignacion.id,
        unidadId:     unidad.id,
        moduloId:     modulo.id,
        fecha:        new Date("2024-01-02T12:00:00.000Z"),
        estado:       "DICTADA",
      },
      {
        institucionId,
        asignacionId: asignacion.id,
        unidadId:     unidad.id,
        moduloId:     modulo.id,
        fecha:        new Date("2024-01-03T12:00:00.000Z"),
        estado:       "SUSPENDIDA",
      },
    ],
  })
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

describe("GET /api/reportes/unidad/[id]", () => {
  it("devuelve resumen correcto", async () => {
    const res  = await fetch(
      `${BASE_URL}/reportes/unidad/${unidadId}?fecha_desde=2024-01-01&fecha_hasta=2024-01-10`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.unidad.id).toBe(unidadId)
    expect(data.resumen.total).toBe(3)
    expect(data.resumen.programadas).toBe(1)
    expect(data.resumen.dictadas).toBe(1)
    expect(data.resumen.suspendidas).toBe(1)
  })

  it("rango sin clases devuelve total 0", async () => {
    const res  = await fetch(
      `${BASE_URL}/reportes/unidad/${unidadId}?fecha_desde=2020-01-01&fecha_hasta=2020-01-31`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.resumen.total).toBe(0)
  })

  it("rechaza sin fechas (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/unidad/${unidadId}`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza unidad inexistente (404)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/unidad/999999?fecha_desde=2024-01-01&fecha_hasta=2024-01-10`,
      { headers }
    )
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/unidad/abc?fecha_desde=2024-01-01&fecha_hasta=2024-01-10`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/unidad/${unidadId}?fecha_desde=2024-01-01&fecha_hasta=2024-01-10`
    )
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/unidad/${unidadId}?fecha_desde=2024-01-01&fecha_hasta=2024-01-10`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })
})