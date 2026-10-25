// tests/fechaYaPaso.test.ts
//
// Comportamiento de fechaYaPaso en el motor de resolución
// (lib/services/resolucionClaseService.ts): una clase de hoy pasa a DICTADA
// recién cuando termina su módulo (o el turno, si es un cargo por jornal), en
// la hora local de la institución.
//
// Invoca resolverClase / resolverClasesVencidas directamente (sin servidor
// HTTP) contra gestor_test, con fixtures propios y limpieza al final. El
// reloj se fija con fake timers SOLO de Date: setTimeout y demás quedan
// reales para que Prisma funcione normal. Argentina es UTC-3: 10:19 AR =
// 13:19Z; 21:00 AR del 22/10 = 00:00Z del 23/10.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { EstadoClase, Causa } from "@prisma/client"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { resolverClase } from "../lib/services/resolucionClaseService"
import { resolverClasesVencidas } from "../lib/usecases/clases/resolverClasesVencidas"

const HOY    = new Date("2026-10-22T00:00:00.000Z")
const MANANA = new Date("2026-10-23T00:00:00.000Z")
const h = (hora: number, minuto = 0) => hora * 60 + minuto

let codigoUnidadCounter = 0

async function crearEscenario() {
  const inst = await createTestInstitucion()
  const institucionId = inst.id
  const turno = await prisma.turno.create({
    data: { institucionId, nombre: `Turno-${randomUUID()}`, horaInicio: h(7, 30), horaFin: h(12) },
  })
  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: ++codigoUnidadCounter, nombre: `Aula-${randomUUID()}` },
  })
  await prisma.periodoOperativo.create({
    data: {
      institucionId, nombre: `Periodo-${randomUUID()}`, estado: "ACTIVO",
      fecha_desde: new Date("2026-10-19"), fecha_hasta: new Date("2026-12-31"),
    },
  })
  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId, unidadId: unidad.id, turnoId: turno.id,
      identificadorEstructural: `FYP-TEST-${randomUUID()}`,
      fecha_inicio: new Date("2026-01-01"),
    },
  })
  // Toda clase con módulo tiene que pertenecer a una distribución vigente:
  // si no, el motor la resuelve como CAMBIO_DISTRIBUCION.
  const distribucion = await prisma.distribucionHoraria.create({
    data: {
      institucionId, asignacionId: asignacion.id, version: 1,
      fecha_vigencia_desde: new Date("2026-10-19"),
    },
  })
  const crearModulo = async (dia: "JUEVES" | "VIERNES", desde: number, hasta: number) => {
    const modulo = await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: dia, hora_desde: desde, hora_hasta: hasta },
    })
    await prisma.distribucionModulo.create({
      data: { distribucionHorariaId: distribucion.id, moduloHorarioId: modulo.id },
    })
    return modulo
  }
  const crearClase = (fecha: Date, moduloId: number | null) =>
    prisma.claseProgramada.create({
      data: {
        institucionId, asignacionId: asignacion.id, unidadId: unidad.id, moduloId, fecha,
        estado: EstadoClase.PROGRAMADA, causa: Causa.NINGUNA,
      },
    })
  return { institucionId, crearModulo, crearClase }
}

async function destroyTestInstitucion(institucionId: number) {
  await prisma.claseProgramada.deleteMany({ where: { institucionId } })
  await prisma.asignacion.deleteMany({ where: { institucionId } })
  await prisma.moduloHorario.deleteMany({ where: { institucionId } })
  await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
  await prisma.turno.deleteMany({ where: { institucionId } })
  await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
  await prisma.institucion.delete({ where: { id: institucionId } })
}

const estadoDe = async (claseId: number) =>
  (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } })).estado

describe("fechaYaPaso — resolverClase con la hora del módulo o del turno", () => {
  let institucionId: number
  let clase1020: number
  let clase1140: number
  let claseJornal: number
  let claseManana: number

  beforeAll(async () => {
    asegurarBaseDeTest()
    const esc = await crearEscenario()
    institucionId = esc.institucionId
    const m1020 = await esc.crearModulo("JUEVES", h(9, 40), h(10, 20))
    const m1140 = await esc.crearModulo("JUEVES", h(11), h(11, 40))
    const mManana = await esc.crearModulo("VIERNES", h(8), h(8, 40))
    clase1020   = (await esc.crearClase(HOY, m1020.id)).id
    clase1140   = (await esc.crearClase(HOY, m1140.id)).id
    claseJornal = (await esc.crearClase(HOY, null)).id // sin módulo: usa Turno.horaFin (12:00)
    claseManana = (await esc.crearClase(MANANA, mManana.id)).id
    vi.useFakeTimers({ toFake: ["Date"] })
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (institucionId) await destroyTestInstitucion(institucionId)
  })

  it("10:19: el módulo que termina 10:20 sigue PROGRAMADA", async () => {
    vi.setSystemTime(new Date("2026-10-22T13:19:00Z"))
    const r = await resolverClase(clase1020, institucionId)
    expect(r.estado).toBe(EstadoClase.PROGRAMADA)
    expect(await estadoDe(clase1020)).toBe(EstadoClase.PROGRAMADA)
  })

  it("10:20: el módulo que termina 10:20 pasa a DICTADA", async () => {
    vi.setSystemTime(new Date("2026-10-22T13:20:00Z"))
    const r = await resolverClase(clase1020, institucionId)
    expect(r.estado).toBe(EstadoClase.DICTADA)
    expect(await estadoDe(clase1020)).toBe(EstadoClase.DICTADA)
  })

  it("10:20: el módulo que termina 11:40 sigue PROGRAMADA", async () => {
    vi.setSystemTime(new Date("2026-10-22T13:20:00Z"))
    const r = await resolverClase(clase1140, institucionId)
    expect(r.estado).toBe(EstadoClase.PROGRAMADA)
  })

  it("11:59: jornal (sin módulo, turno hasta 12:00) sigue PROGRAMADA", async () => {
    vi.setSystemTime(new Date("2026-10-22T14:59:00Z"))
    const r = await resolverClase(claseJornal, institucionId)
    expect(r.estado).toBe(EstadoClase.PROGRAMADA)
  })

  it("12:00: jornal pasa a DICTADA al terminar el turno", async () => {
    vi.setSystemTime(new Date("2026-10-22T15:00:00Z"))
    const r = await resolverClase(claseJornal, institucionId)
    expect(r.estado).toBe(EstadoClase.DICTADA)
  })

  it("21:00 AR (ya 23/10 en UTC): la clase de mañana sigue PROGRAMADA", async () => {
    vi.setSystemTime(new Date("2026-10-23T00:00:00Z"))
    const r = await resolverClase(claseManana, institucionId)
    expect(r.estado).toBe(EstadoClase.PROGRAMADA)
    expect(await estadoDe(claseManana)).toBe(EstadoClase.PROGRAMADA)
  })
})

describe("fechaYaPaso — resolverClasesVencidas revisa las de hoy y marca solo las terminadas", () => {
  let institucionId: number
  let clase1020: number
  let clase1140: number
  let claseManana: number

  beforeAll(async () => {
    asegurarBaseDeTest()
    const esc = await crearEscenario()
    institucionId = esc.institucionId
    const m1020 = await esc.crearModulo("JUEVES", h(9, 40), h(10, 20))
    const m1140 = await esc.crearModulo("JUEVES", h(11), h(11, 40))
    const mManana = await esc.crearModulo("VIERNES", h(8), h(8, 40))
    clase1020   = (await esc.crearClase(HOY, m1020.id)).id
    clase1140   = (await esc.crearClase(HOY, m1140.id)).id
    claseManana = (await esc.crearClase(MANANA, mManana.id)).id
    vi.useFakeTimers({ toFake: ["Date"] })
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (institucionId) await destroyTestInstitucion(institucionId)
  })

  it("10:20: revisa 2 (las de hoy, no la de mañana) y marca 1 DICTADA", async () => {
    vi.setSystemTime(new Date("2026-10-22T13:20:00Z"))
    const r = await resolverClasesVencidas(institucionId)
    expect(r).toEqual({ clasesRevisadas: 2, clasesMarcadasDictadas: 1 })
    expect(await estadoDe(clase1020)).toBe(EstadoClase.DICTADA)
    expect(await estadoDe(clase1140)).toBe(EstadoClase.PROGRAMADA)
    expect(await estadoDe(claseManana)).toBe(EstadoClase.PROGRAMADA)
  })
})
