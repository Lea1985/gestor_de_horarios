// tests/reportes.reemplazos.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, createTestAgente, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:         Record<string, string>
let institucionId:   number
let asignacionId:    number
let asigSuplenteId:  number
let claseId:         number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const agenteTitular  = await createTestAgente(institucionId)
  const agenteSuplente = await createTestAgente(institucionId)

  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Rep Reemp Test" },
  })

  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agenteTitular.id,
      unidadId:                unidad.id,
      identificadorEstructural: `REP-REEMP-TIT-${randomUUID()}`,
      fecha_inicio:            new Date("2024-01-01"),
    },
  })
  asignacionId = asignacion.id

  const suplente = await prisma.asignacion.create({
    data: {
      institucionId,
      agenteId:                agenteSuplente.id,
      unidadId:                unidad.id,
      identificadorEstructural: `REP-REEMP-SUP-${randomUUID()}`,
      fecha_inicio:            new Date("2024-01-01"),
    },
  })
  asigSuplenteId = suplente.id

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 540 },
  })

  const clase = await prisma.claseProgramada.create({
    data: {
      institucionId,
      asignacionId,
      unidadId: unidad.id,
      moduloId: modulo.id,
      fecha:    new Date("2024-01-08T12:00:00.000Z"),
      estado:   "PROGRAMADA",
    },
  })
  claseId = clase.id

  await prisma.reemplazo.create({
    data: {
      claseId,
      asignacionTitularId:  asignacionId,
      asignacionSuplenteId: asigSuplenteId,
      observacion:          "Reemplazo test reporte",
    },
  })

  await prisma.claseProgramada.update({
    where: { id: claseId },
    data:  { estado: "REEMPLAZADA" },
  })
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

describe("GET /api/reportes/reemplazos", () => {
  it("devuelve reemplazos en el rango", async () => {
    const res  = await fetch(
      `${BASE_URL}/reportes/reemplazos?desde=2024-01-01&hasta=2024-01-31`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  it("rango sin reemplazos devuelve array vacío", async () => {
    const res  = await fetch(
      `${BASE_URL}/reportes/reemplazos?desde=2020-01-01&hasta=2020-01-31`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(0)
  })

  it("rechaza sin fechas (400)", async () => {
    const res = await fetch(`${BASE_URL}/reportes/reemplazos`, { headers })
    expect(res.status).toBe(400)
  })

  it("rechaza sin desde (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/reemplazos?hasta=2024-01-31`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/reemplazos?desde=2024-01-01&hasta=2024-01-31`
    )
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/reemplazos?desde=2024-01-01&hasta=2024-01-31`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })
})