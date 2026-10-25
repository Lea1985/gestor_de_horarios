// tests/generarParaRango.test.ts
//
// claseProgramadaService.generarParaRango (Fase 3a): las clases nuevas se
// vinculan a la licencia activa que cubre su fecha (la de id más alto si hay
// varias, o sea la hija) y pasan por el motor; con el cliente transaccional
// (db) todo corre dentro de la transacción del llamador y se revierte con ella.
//
// Contra gestor_test, con fixtures propios y limpieza al final. Reloj
// simulado solo para Date: "hoy" es el 22/10/2026 (jueves) a las 10:00 AR.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { claseProgramadaService } from "../lib/services/claseProgramadaService"
import { resolverClase } from "../lib/services/resolucionClaseService"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const { PROGRAMADA, SUSPENDIDA, DICTADA } = EstadoClase

class ErrorProvocado extends Error {}

let institucionId: number
let periodoId: number
let unidadId: number
let turnoId: number
let comisionId: number
let moduloLunes: number
let itemPaga: number
let itemNoPaga: number

async function nuevaAsignacionConDistribucion() {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `GPR-${randomUUID()}`,
      fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-03-01") },
  })
  await prisma.distribucionModulo.create({ data: { distribucionHorariaId: dist.id, moduloHorarioId: moduloLunes } })
  return { asignacion: a, distribucionId: dist.id }
}

const generar = (asignacionId: number, distribucionId: number, desde: string, hasta: string, db?: Parameters<typeof claseProgramadaService.generarParaRango>[1]) =>
  claseProgramadaService.generarParaRango({
    institucionId, asignacionId, unidadId, comisionId, distribucionId, periodoId,
    desde: d(desde), hasta: d(hasta),
  }, db)

const licencia = (asignacionId: number, desde: string, hasta: string, codigarioItemId: number, incidenciaPadreId?: number) =>
  prisma.incidencia.create({
    data: { asignacionId, codigarioItemId, fecha_desde: d(desde), fecha_hasta: d(hasta), incidenciaPadreId },
  })

const clasesDe = (asignacionId: number) =>
  prisma.claseProgramada.findMany({ where: { asignacionId }, orderBy: { fecha: "asc" } })

const porFecha = async (asignacionId: number) =>
  Object.fromEntries((await clasesDe(asignacionId)).map(c => [c.fecha.toISOString().slice(0, 10), c]))

describe("generarParaRango — licencias vigentes, motor y transacción", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-22T13:00:00.000Z"))
    const inst = await createTestInstitucion()
    institucionId = inst.id
    turnoId = (await prisma.turno.create({
      data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 },
    })).id
    unidadId = (await prisma.unidadOrganizativa.create({
      data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` },
    })).id
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    comisionId = (await prisma.comision.create({
      data: { institucionId, cursoId: curso.id, turnoId, nombre: `Com-${randomUUID()}` },
    })).id
    periodoId = (await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO",
        fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-12-31"),
      },
    })).id
    moduloLunes = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
    })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemPaga = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "PAGA", nombre: "Paga", porcentajeComputable: 100 },
    })).id
    itemNoPaga = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "NOPAGA", nombre: "No paga", porcentajeComputable: 0 },
    })).id
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.calendarioEscolar.deleteMany({ where: { institucionId } })
    await prisma.incidencia.updateMany({ where: { asignacion: { institucionId } }, data: { incidenciaPadreId: null } })
    await prisma.incidencia.deleteMany({ where: { asignacion: { institucionId } } })
    await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
    await prisma.codigario.deleteMany({ where: { institucionId } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.comision.deleteMany({ where: { institucionId } })
    await prisma.curso.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("vincula cada clase nueva a su licencia (la hija dentro de la padre) y la resuelve, dentro de una transacción", async () => {
    const { asignacion, distribucionId } = await nuevaAsignacionConDistribucion()
    const padre = await licencia(asignacion.id, "2026-11-02", "2026-11-23", itemPaga)
    const hija = await licencia(asignacion.id, "2026-11-09", "2026-11-16", itemPaga, padre.id)

    // Dentro de la transacción: el motor tiene que ver las clases recién
    // creadas (si usara el prisma global, no las encontraría).
    const r = await prisma.$transaction(tx => generar(asignacion.id, distribucionId, "2026-11-01", "2026-11-30", tx))
    expect(r.creadas).toBe(5) // lunes 2, 9, 16, 23 y 30

    const c = await porFecha(asignacion.id)
    expect(c["2026-11-02"].incidenciaId).toBe(padre.id)
    expect(c["2026-11-09"].incidenciaId).toBe(hija.id)
    expect(c["2026-11-16"].incidenciaId).toBe(hija.id)
    expect(c["2026-11-23"].incidenciaId).toBe(padre.id)
    expect(c["2026-11-30"].incidenciaId).toBe(null)
    for (const f of ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]) {
      expect({ estado: c[f].estado, causa: c[f].causa }).toEqual({ estado: SUSPENDIDA, causa: Causa.INCIDENCIA })
    }
    expect({ estado: c["2026-11-30"].estado, causa: c["2026-11-30"].causa }).toEqual({ estado: PROGRAMADA, causa: Causa.NINGUNA })

    // Idempotente: una segunda llamada no crea ni toca nada.
    const r2 = await generar(asignacion.id, distribucionId, "2026-11-01", "2026-11-30")
    expect(r2.creadas).toBe(0)
    expect(r2.saltadasPorExistentes).toBe(5)
  })

  it("feriado: con licencia que paga queda INCIDENCIA; con la que no paga y sin licencia, CALENDARIO_ESCOLAR con su evento", async () => {
    const evento = await prisma.calendarioEscolar.create({
      data: {
        institucionId, periodoOperativoId: periodoId, fecha: d("2026-12-07"),
        descripcion: "Feriado", esFeriado: true, suspendeClases: true,
      },
    })
    const paga = await nuevaAsignacionConDistribucion()
    const noPaga = await nuevaAsignacionConDistribucion()
    const sinLicencia = await nuevaAsignacionConDistribucion()
    await licencia(paga.asignacion.id, "2026-12-07", "2026-12-07", itemPaga)
    await licencia(noPaga.asignacion.id, "2026-12-07", "2026-12-07", itemNoPaga)

    for (const x of [paga, noPaga, sinLicencia]) {
      await generar(x.asignacion.id, x.distribucionId, "2026-12-07", "2026-12-07")
    }

    const [cPaga] = await clasesDe(paga.asignacion.id)
    const [cNoPaga] = await clasesDe(noPaga.asignacion.id)
    const [cSin] = await clasesDe(sinLicencia.asignacion.id)
    expect({ estado: cPaga.estado, causa: cPaga.causa, cal: cPaga.calendarioEscolarId })
      .toEqual({ estado: SUSPENDIDA, causa: Causa.INCIDENCIA, cal: null })
    expect({ estado: cNoPaga.estado, causa: cNoPaga.causa, cal: cNoPaga.calendarioEscolarId })
      .toEqual({ estado: SUSPENDIDA, causa: Causa.CALENDARIO_ESCOLAR, cal: evento.id })
    expect({ estado: cSin.estado, causa: cSin.causa, cal: cSin.calendarioEscolarId })
      .toEqual({ estado: SUSPENDIDA, causa: Causa.CALENDARIO_ESCOLAR, cal: evento.id })
  })

  it("rollback: si la transacción falla, no queda ninguna clase generada", async () => {
    const { asignacion, distribucionId } = await nuevaAsignacionConDistribucion()
    await expect(prisma.$transaction(async tx => {
      await generar(asignacion.id, distribucionId, "2026-11-01", "2026-11-30", tx)
      throw new ErrorProvocado("falla a mitad de camino")
    })).rejects.toBeInstanceOf(ErrorProvocado)
    expect(await clasesDe(asignacion.id)).toHaveLength(0)
  })

  it("rollback: resolverClase con el cliente transaccional se revierte con la transacción", async () => {
    const { asignacion } = await nuevaAsignacionConDistribucion()
    const clase = await prisma.claseProgramada.create({
      data: { institucionId, asignacionId: asignacion.id, unidadId, comisionId, moduloId: moduloLunes, fecha: d("2026-10-12") },
    })
    await expect(prisma.$transaction(async tx => {
      const r = await resolverClase(clase.id, institucionId, tx)
      expect(r.estado).toBe(DICTADA) // dentro de la transacción ya cambió
      throw new ErrorProvocado("falla después de resolver")
    })).rejects.toBeInstanceOf(ErrorProvocado)
    const despues = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } })
    expect(despues.estado).toBe(PROGRAMADA)
    expect(despues.versionResolucion).toBe(clase.versionResolucion)
  })
})
