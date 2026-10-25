// tests/bajaDistribucion.test.ts
//
// eliminarDistribucion y reactivarDistribucion (Fase 3c) con reconciliación:
// la baja rige desde el día local de su deletedAt (las clases anteriores no
// se tocan) y reactivar reconcilia desde ese día, sin reescribir el pasado
// salvo confirmación explícita.
//
// Contra gestor_test, usecases directos, reloj simulado solo para Date:
// jueves 22/10/2026, 10:00 AR (se adelanta en el caso de reactivar días
// después). Distribución desde el lunes 05/10, período hasta el 30/11.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { asignarModulos } from "../lib/usecases/distribuciones/asignarModulos"
import { eliminarDistribucion } from "../lib/usecases/distribuciones/eliminarDistribucion"
import { reactivarDistribucion } from "../lib/usecases/distribuciones/reactivarDistribucion"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (f: Date) => f.toISOString().slice(0, 10)
const AHORA = new Date("2026-10-22T13:00:00.000Z")
const LUNES_PASADOS = ["2026-10-05", "2026-10-12", "2026-10-19"]
const LUNES_FUTUROS = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]

let institucionId: number
let unidadId: number
let turnoId: number
let comisionId: number
let lunes: number

async function distribucionConLunes() {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `BD-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-10-05") },
  })
  await asignarModulos(dist.id, institucionId, { modulos: [lunes] })
  return { asignacionId: a.id, distribucionId: dist.id }
}

async function estadosPorFecha(asignacionId: number) {
  const c = await prisma.claseProgramada.findMany({ where: { asignacionId }, orderBy: { fecha: "asc" } })
  return Object.fromEntries(c.map(x => [iso(x.fecha), `${x.estado}/${x.causa}`]))
}
const todos = (n: number, v: string) => Array(n).fill(v)

describe("baja y reactivación de distribución con reconciliación", () => {
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
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.comision.deleteMany({ where: { institucionId } })
    await prisma.curso.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("eliminar: las clases de hoy en adelante pasan a CAMBIO_DISTRIBUCION; las anteriores no se tocan", async () => {
    vi.setSystemTime(AHORA)
    const { asignacionId, distribucionId } = await distribucionConLunes()
    const r = await eliminarDistribucion(distribucionId, institucionId)
    expect(r).toMatchObject({ ok: true, deleted: true, clasesSuspendidas: LUNES_FUTUROS.length })
    const e = await estadosPorFecha(asignacionId)
    expect(LUNES_PASADOS.map(f => e[f])).toEqual(todos(3, "DICTADA/NINGUNA"))
    expect(LUNES_FUTUROS.map(f => e[f])).toEqual(todos(6, "SUSPENDIDA/CAMBIO_DISTRIBUCION"))
  })

  it("reactivar el mismo día: reconcilia desde la baja y revive las mismas clases", async () => {
    vi.setSystemTime(AHORA)
    const { asignacionId, distribucionId } = await distribucionConLunes()
    const antes = await prisma.claseProgramada.findMany({ where: { asignacionId }, orderBy: { id: "asc" }, select: { id: true } })
    await eliminarDistribucion(distribucionId, institucionId)
    const r = await reactivarDistribucion(distribucionId, institucionId)
    expect(r).toMatchObject({ ok: true, desde: "2026-10-22", clasesResueltas: LUNES_FUTUROS.length })
    const e = await estadosPorFecha(asignacionId)
    expect(LUNES_FUTUROS.map(f => e[f])).toEqual(todos(6, "PROGRAMADA/NINGUNA"))
    const despues = await prisma.claseProgramada.findMany({ where: { asignacionId }, orderBy: { id: "asc" }, select: { id: true } })
    expect(despues).toEqual(antes) // mismas filas, sin duplicar
  })

  it("reactivar días después: por defecto desde hoy (el pasado queda como estaba); con reescribirPasado, desde la baja", async () => {
    vi.setSystemTime(AHORA)
    const a = await distribucionConLunes()
    const b = await distribucionConLunes()
    await eliminarDistribucion(a.distribucionId, institucionId)
    await eliminarDistribucion(b.distribucionId, institucionId)
    vi.setSystemTime(new Date("2026-10-29T13:00:00.000Z")) // jueves siguiente: el lunes 26/10 ya pasó

    const ra = await reactivarDistribucion(a.distribucionId, institucionId)
    expect(ra).toMatchObject({ ok: true, desde: "2026-10-29" })
    const ea = await estadosPorFecha(a.asignacionId)
    expect(ea["2026-10-26"]).toBe("SUSPENDIDA/CAMBIO_DISTRIBUCION")
    expect(LUNES_FUTUROS.slice(1).map(f => ea[f])).toEqual(todos(5, "PROGRAMADA/NINGUNA"))

    const rb = await reactivarDistribucion(b.distribucionId, institucionId, { reescribirPasado: true })
    expect(rb).toMatchObject({ ok: true, desde: "2026-10-22" })
    const eb = await estadosPorFecha(b.asignacionId)
    expect(eb["2026-10-26"]).toBe("DICTADA/NINGUNA")
    expect(LUNES_FUTUROS.slice(1).map(f => eb[f])).toEqual(todos(5, "PROGRAMADA/NINGUNA"))
    vi.setSystemTime(AHORA)
  })

})
