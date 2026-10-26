// tests/asignarModulos.test.ts
//
// asignarModulos ("Editar", Fase 3c): reasigna módulos y reconcilia en una
// transacción. Por defecto rige desde hoy; con desde anterior corrige el
// pasado solo con reescribirPasado; la primera asignación de módulos genera
// desde el inicio de la distribución sin pedir confirmación; los reemplazos
// futuros que desaparecen piden confirmación y mantenerReemplazo es opcional.
//
// Contra gestor_test, usecase directo, reloj simulado solo para Date: jueves
// 22/10/2026, 10:00 AR. Distribución desde el lunes 05/10, período hasta el
// 30/11 para acotar el volumen.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { asignarModulos } from "../lib/usecases/distribuciones/asignarModulos"
import { crearReemplazo } from "../lib/usecases/reemplazos/crearReemplazo"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (f: Date) => f.toISOString().slice(0, 10)
const LUNES_PASADOS = ["2026-10-05", "2026-10-12", "2026-10-19"]
const LUNES_FUTUROS = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]
const MARTES_PASADOS = ["2026-10-06", "2026-10-13", "2026-10-20"]
const MARTES_FUTUROS = ["2026-10-27", "2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"]

let institucionId: number
let unidadId: number
let turnoId: number
let comisionId: number
let lunes: number
let martes: number
let itemPaga: number
let suplente: number

async function nuevaDistribucion(licencia?: { desde: string; hasta: string }) {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `ASM-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-10-05") },
  })
  const inc = licencia
    ? await prisma.incidencia.create({
        data: { asignacionId: a.id, codigarioItemId: itemPaga, fecha_desde: d(licencia.desde), fecha_hasta: d(licencia.hasta) },
      })
    : null
  return { asignacionId: a.id, distribucionId: dist.id, incidenciaId: inc?.id ?? null }
}

async function clases(asignacionId: number, moduloId: number) {
  const filas = await prisma.claseProgramada.findMany({
    where: { asignacionId, moduloId }, orderBy: { fecha: "asc" },
    include: { reemplazos: { where: { activo: true } } },
  })
  return Object.fromEntries(filas.map(c => [iso(c.fecha), c]))
}
const estados = (porFecha: Record<string, { estado: string; causa: string }>, fechas: string[]) =>
  fechas.map(f => porFecha[f] ? `${porFecha[f].estado}/${porFecha[f].causa}` : "no existe")
const todos = (n: number, v: string) => Array(n).fill(v)

describe("asignarModulos — Editar con reconciliación", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-22T13:00:00.000Z"))
    institucionId = (await createTestInstitucion()).id
    turnoId = (await prisma.turno.create({ data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 } })).id
    unidadId = (await prisma.unidadOrganizativa.create({ data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` } })).id
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    comisionId = (await prisma.comision.create({ data: { institucionId, cursoId: curso.id, turnoId, nombre: `Com-${randomUUID()}` } })).id
    await prisma.periodoOperativo.create({
      data: { institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO", fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-11-30") },
    })
    lunes = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 } })).id
    martes = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "MARTES", hora_desde: 480, hora_hasta: 520 } })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemPaga = (await prisma.codigarioItem.create({ data: { codigarioId: codigario.id, codigo: "PAGA", nombre: "Paga" } })).id
    suplente = (await prisma.agente.create({
      data: { institucionId, nombre: "Suplente", apellido: "Editar", documento: `DOC-${randomUUID()}`, email: `s-${randomUUID()}@test.dev`, estado: "ACTIVO" },
    })).id
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.incidencia.deleteMany({ where: { asignacion: { institucionId } } })
    await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
    await prisma.codigario.deleteMany({ where: { institucionId } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.agente.deleteMany({ where: { institucionId } })
    await prisma.comision.deleteMany({ where: { institucionId } })
    await prisma.curso.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("primera asignación: genera desde el inicio de la distribución sin pedir confirmación", async () => {
    const { asignacionId, distribucionId } = await nuevaDistribucion()
    const r = await asignarModulos(distribucionId, institucionId, { modulos: [lunes] })
    expect(r.ok).toBe(true)
    expect(r.clasesCreadas).toBe(LUNES_PASADOS.length + LUNES_FUTUROS.length)
    const l = await clases(asignacionId, lunes)
    expect(estados(l, LUNES_PASADOS)).toEqual(todos(3, "DICTADA/NINGUNA"))
    expect(estados(l, LUNES_FUTUROS)).toEqual(todos(6, "PROGRAMADA/NINGUNA"))
  })

  it("Editar por defecto rige desde hoy: el pasado no se toca", async () => {
    const { asignacionId, distribucionId } = await nuevaDistribucion()
    await asignarModulos(distribucionId, institucionId, { modulos: [lunes] })
    const r = await asignarModulos(distribucionId, institucionId, { modulos: [martes] })
    expect(r.ok).toBe(true)
    expect(r.desde).toBe("2026-10-22")
    const l = await clases(asignacionId, lunes)
    const m = await clases(asignacionId, martes)
    expect(estados(l, LUNES_PASADOS)).toEqual(todos(3, "DICTADA/NINGUNA"))
    expect(estados(l, LUNES_FUTUROS)).toEqual(todos(6, "SUSPENDIDA/CAMBIO_DISTRIBUCION"))
    expect(estados(m, MARTES_PASADOS)).toEqual(todos(3, "no existe"))
    expect(estados(m, MARTES_FUTUROS)).toEqual(todos(5, "PROGRAMADA/NINGUNA"))
  })

  it("edición retroactiva: desde el inicio pide confirmación (nada cambia) y con reescribirPasado corrige el pasado", async () => {
    const { asignacionId, distribucionId } = await nuevaDistribucion()
    await asignarModulos(distribucionId, institucionId, { modulos: [lunes] })

    const sin = await asignarModulos(distribucionId, institucionId, { modulos: [martes], desde: "2026-10-05" })
    expect(sin.ok).toBe(false)
    expect(sin.requiereConfirmacion).toBe(true)
    expect(sin.aviso?.dictadasAReescribir.map(x => x.fecha)).toEqual(LUNES_PASADOS)
    expect(sin.aviso?.clasesPasadasNuevas.map(x => x.fecha)).toEqual(MARTES_PASADOS)
    // Rollback: los módulos tampoco cambiaron.
    const modulos = await prisma.distribucionModulo.findMany({ where: { distribucionHorariaId: distribucionId } })
    expect(modulos.map(m => m.moduloHorarioId)).toEqual([lunes])
    expect(estados(await clases(asignacionId, lunes), LUNES_FUTUROS)).toEqual(todos(6, "PROGRAMADA/NINGUNA"))

    const con = await asignarModulos(distribucionId, institucionId, { modulos: [martes], desde: "2026-10-05", reescribirPasado: true })
    expect(con.ok).toBe(true)
    const l = await clases(asignacionId, lunes)
    const m = await clases(asignacionId, martes)
    expect(estados(l, [...LUNES_PASADOS, ...LUNES_FUTUROS])).toEqual(todos(9, "SUSPENDIDA/CAMBIO_DISTRIBUCION"))
    expect(estados(m, MARTES_PASADOS)).toEqual(todos(3, "DICTADA/NINGUNA"))
    expect(estados(m, MARTES_FUTUROS)).toEqual(todos(5, "PROGRAMADA/NINGUNA"))
  })

  it("desde anterior al inicio de la distribución se acota al inicio", async () => {
    const { distribucionId } = await nuevaDistribucion()
    await asignarModulos(distribucionId, institucionId, { modulos: [lunes] })
    const r = await asignarModulos(distribucionId, institucionId, { modulos: [lunes, martes], desde: "2026-09-01", reescribirPasado: true })
    expect(r.ok).toBe(true)
    expect(r.desde).toBe("2026-10-05")
  })

  it("reemplazos futuros: pide confirmación con la lista; mantenerReemplazo lo elige el usuario", async () => {
    const { asignacionId, distribucionId, incidenciaId } = await nuevaDistribucion({ desde: "2026-10-05", hasta: "2026-11-30" })
    await asignarModulos(distribucionId, institucionId, { modulos: [lunes] })
    const l = await clases(asignacionId, lunes)
    for (const f of LUNES_FUTUROS) {
      await crearReemplazo(institucionId, { claseId: l[f].id, asignacionTitularId: asignacionId, agenteSuplenteId: suplente })
    }

    const pregunta = await asignarModulos(distribucionId, institucionId, { modulos: [martes] })
    expect(pregunta.requiereConfirmacion).toBe(true)
    expect(pregunta.aviso?.reemplazosAAnular.map(x => [x.fecha, x.suplente])).toEqual(
      LUNES_FUTUROS.map(f => [f, "Editar, Suplente"])
    )

    const r = await asignarModulos(distribucionId, institucionId, { modulos: [martes], confirmarAnulacion: true, mantenerReemplazo: true })
    expect(r.ok).toBe(true)
    expect(r.reemplazosAnulados).toHaveLength(LUNES_FUTUROS.length)
    expect(r.reemplazosMantenidos).toBe(MARTES_FUTUROS.length)
    const m = await clases(asignacionId, martes)
    expect(estados(m, MARTES_FUTUROS)).toEqual(todos(5, "REEMPLAZADA/INCIDENCIA"))
    expect(MARTES_FUTUROS.every(f => m[f].reemplazos[0]?.incidenciaId === incidenciaId)).toBe(true)
  })

  it("Editar sin desde en una versión que empieza en el futuro: rige desde el inicio de la versión y no hay clases antes", async () => {
    const a = await prisma.asignacion.create({
      data: {
        institucionId, unidadId, turnoId, comisionId,
        identificadorEstructural: `ASM-FUT-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
      },
    })
    const dist = await prisma.distribucionHoraria.create({
      data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-11-02") },
    })
    await asignarModulos(dist.id, institucionId, { modulos: [lunes] })

    const r = await asignarModulos(dist.id, institucionId, { modulos: [lunes, martes] })

    expect(r.ok).toBe(true)
    expect(r.desde).toBe("2026-11-02")
    expect(await prisma.claseProgramada.count({ where: { asignacionId: a.id, fecha: { lt: d("2026-11-02") } } })).toBe(0)
    expect(Object.keys(await clases(a.id, lunes))[0]).toBe("2026-11-02")
    expect(Object.keys(await clases(a.id, martes))[0]).toBe("2026-11-03")
  })
})
