// tests/bajaAsignacion.test.ts
//
// eliminarAsignacion y reactivarAsignacion (Fase 3c) con reconciliación: la
// baja rige desde el día local de su deletedAt, inclusive (las clases
// anteriores no se tocan; hallazgo de la Fase 2: antes podían quedar
// FIN_ASIGNACION clases previas a la baja) y reactivar reconcilia desde ese
// día sin reescribir el pasado salvo confirmación explícita.
//
// Contra gestor_test, usecases directos, reloj simulado solo para Date:
// jueves 22/10/2026, 10:00 AR. Distribución desde el lunes 05/10, período
// hasta el 30/11.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { asignarModulos } from "../lib/usecases/distribuciones/asignarModulos"
import { eliminarAsignacion } from "../lib/usecases/asignaciones/eliminarAsignacion"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (f: Date) => f.toISOString().slice(0, 10)
const AHORA = new Date("2026-10-22T13:00:00.000Z")
const LUNES_PASADOS = ["2026-10-05", "2026-10-12", "2026-10-19"]
const LUNES_FUTUROS = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]
const JUEVES_HOY = "2026-10-22"

let institucionId: number
let unidadId: number
let turnoId: number
let comisionId: number
let lunes: number
let jueves: number

async function asignacionConClases() {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `BA-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-10-05") },
  })
  await asignarModulos(dist.id, institucionId, { modulos: [lunes, jueves] })
  return a.id
}

async function estadosPorFecha(asignacionId: number, moduloId: number) {
  const c = await prisma.claseProgramada.findMany({ where: { asignacionId, moduloId }, orderBy: { fecha: "asc" } })
  return Object.fromEntries(c.map(x => [iso(x.fecha), `${x.estado}/${x.causa}`]))
}
const todos = (n: number, v: string) => Array(n).fill(v)

describe("baja y reactivación de asignación con reconciliación", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(AHORA)
    institucionId = (await createTestInstitucion()).id
    turnoId = (await prisma.turno.create({ data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 } })).id
    unidadId = (await prisma.unidadOrganizativa.create({ data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` } })).id
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    comisionId = (await prisma.comision.create({ data: { institucionId, cursoId: curso.id, turnoId, nombre: `Com-${randomUUID()}` } })).id
    await prisma.periodoOperativo.create({
      data: { institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO", fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-11-30") },
    })
    lunes = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 } })).id
    // Jueves 14:00-14:40: la clase de hoy todavía no terminó a las 10:00.
    jueves = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "JUEVES", hora_desde: 840, hora_hasta: 880 } })).id
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.titularAsignacion.deleteMany({ where: { asignacion: { institucionId } } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.comision.deleteMany({ where: { institucionId } })
    await prisma.curso.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("eliminar: FIN_ASIGNACION desde el día de la baja (incluida la clase de hoy); las anteriores no se tocan", async () => {
    vi.setSystemTime(AHORA)
    const asignacionId = await asignacionConClases()
    const r = await eliminarAsignacion(asignacionId, institucionId)
    expect(r).toMatchObject({ ok: true, deleted: true })
    const l = await estadosPorFecha(asignacionId, lunes)
    const j = await estadosPorFecha(asignacionId, jueves)
    expect(LUNES_PASADOS.map(f => l[f])).toEqual(todos(3, "DICTADA/NINGUNA"))
    expect(LUNES_FUTUROS.map(f => l[f])).toEqual(todos(6, "SUSPENDIDA/FIN_ASIGNACION"))
    expect(j["2026-10-15"]).toBe("DICTADA/NINGUNA")
    expect(j[JUEVES_HOY]).toBe("SUSPENDIDA/FIN_ASIGNACION")
  })
})
