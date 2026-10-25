// tests/condicionesVigentes.test.ts
//
// Condiciones que obtenerCondicionesVigentes (lib/services/resolucionClaseService.ts)
// lee de la base para el motor: asignacionVigente (B), moduloVigente (C),
// tieneIncidenciaActiva (I) y articuloPaga (P). Casos aprobados en la Fase 2
// del plan de corrección del motor; el código de cada caso es el de esa tabla.
//
// Contra gestor_test, con fixtures propios y limpieza al final. El reloj se
// fija solo para Date: "hoy" es el 22/10/2026 a las 10:00 AR (13:00Z). La
// baja (deletedAt) deja de regir desde su día local, inclusive.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { obtenerCondicionesVigentes } from "../lib/services/resolucionClaseService"
import { asignacionRepository } from "../lib/repositories/asignacionRepository"
import { distribucionRepository } from "../lib/repositories/distribucionRepository"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const AHORA = new Date("2026-10-22T13:00:00.000Z")

let institucionId: number
let turnoId: number
let unidadId: number
let periodoId: number
let moduloA: number
let moduloB: number
let itemPaga: number
let itemNoPaga: number
let contador = 0

async function nuevaAsignacion(extra: { fecha_fin?: Date; activo?: boolean; deletedAt?: Date } = {}) {
  return prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId,
      identificadorEstructural: `COND-${randomUUID()}`,
      fecha_inicio: d("2026-01-01"),
      ...extra,
    },
  })
}

async function nuevaDistribucion(asignacionId: number, params: {
  desde: Date
  hasta?: Date | null
  modulos: number[]
  estado?: "ACTIVO" | "INACTIVO"
  activo?: boolean
}) {
  const dist = await prisma.distribucionHoraria.create({
    data: {
      institucionId, asignacionId, version: ++contador,
      fecha_vigencia_desde: params.desde,
      fecha_vigencia_hasta: params.hasta ?? null,
      estado: params.estado ?? "ACTIVO",
      activo: params.activo ?? true,
    },
  })
  for (const moduloHorarioId of params.modulos) {
    await prisma.distribucionModulo.create({ data: { distribucionHorariaId: dist.id, moduloHorarioId } })
  }
  return dist
}

async function nuevaClase(asignacionId: number, fecha: Date, moduloId: number | null, incidenciaId?: number) {
  return prisma.claseProgramada.create({
    data: { institucionId, asignacionId, unidadId, moduloId, fecha, incidenciaId: incidenciaId ?? null },
  })
}

const condiciones = (claseId: number) => obtenerCondicionesVigentes(claseId, institucionId)

describe("obtenerCondicionesVigentes — condiciones leídas de la base", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(AHORA)
    const inst = await createTestInstitucion()
    institucionId = inst.id
    turnoId = (await prisma.turno.create({
      data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 },
    })).id
    unidadId = (await prisma.unidadOrganizativa.create({
      data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` },
    })).id
    periodoId = (await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO",
        fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-12-31"),
      },
    })).id
    moduloA = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "JUEVES", hora_desde: 480, hora_hasta: 520 },
    })).id
    moduloB = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "JUEVES", hora_desde: 520, hora_hasta: 560 },
    })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemPaga = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "PAGA", nombre: "Paga", porcentajeComputable: 100 },
    })).id
    itemNoPaga = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "NOPAGA", nombre: "No paga", porcentajeComputable: 0 },
    })).id
    // Feriado del 22/10 para los casos P (no afecta A ni M).
    await prisma.calendarioEscolar.create({
      data: {
        institucionId, periodoOperativoId: periodoId, fecha: d("2026-10-22"),
        descripcion: "Feriado test", esFeriado: true, suspendeClases: true,
      },
    })
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.incidencia.deleteMany({ where: { asignacion: { institucionId } } })
    await prisma.calendarioEscolar.deleteMany({ where: { institucionId } })
    await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
    await prisma.codigario.deleteMany({ where: { institucionId } })
    await prisma.asignacion.deleteMany({ where: { institucionId } }) // distribuciones en cascada
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  describe("B — asignacionVigente", () => {
    it("B1: activa sin fecha_fin -> vigente", async () => {
      const a = await nuevaAsignacion()
      const c = await nuevaClase(a.id, d("2026-10-22"), null)
      expect((await condiciones(c.id)).asignacionVigente).toBe(true)
    })

    it("B2: fecha_fin igual a la fecha de la clase -> vigente (inclusive)", async () => {
      const a = await nuevaAsignacion({ fecha_fin: d("2026-10-22") })
      const c = await nuevaClase(a.id, d("2026-10-22"), null)
      expect((await condiciones(c.id)).asignacionVigente).toBe(true)
    })

    it("B3: fecha_fin anterior a la clase -> no vigente", async () => {
      const a = await nuevaAsignacion({ fecha_fin: d("2026-10-21") })
      const c = await nuevaClase(a.id, d("2026-10-22"), null)
      expect((await condiciones(c.id)).asignacionVigente).toBe(false)
    })

    it("B4: eliminada hoy (softDelete) -> vigente el 21/10, no el 22/10 ni el 23/10", async () => {
      const a = await nuevaAsignacion()
      const c21 = await nuevaClase(a.id, d("2026-10-21"), null)
      const c22 = await nuevaClase(a.id, d("2026-10-22"), null)
      const c23 = await nuevaClase(a.id, d("2026-10-23"), null)
      await asignacionRepository.softDelete(a.id, institucionId) // deletedAt = 22/10 13:00Z
      expect((await condiciones(c21.id)).asignacionVigente).toBe(true)
      expect((await condiciones(c22.id)).asignacionVigente).toBe(false)
      expect((await condiciones(c23.id)).asignacionVigente).toBe(false)
    })

    it("B5: eliminada el 22/10 a las 23:30 AR (ya 23/10 en UTC) -> el corte es el día local 22/10", async () => {
      const a = await nuevaAsignacion({ activo: false, deletedAt: new Date("2026-10-23T02:30:00.000Z") })
      const c21 = await nuevaClase(a.id, d("2026-10-21"), null)
      const c22 = await nuevaClase(a.id, d("2026-10-22"), null)
      expect((await condiciones(c21.id)).asignacionVigente).toBe(true)
      expect((await condiciones(c22.id)).asignacionVigente).toBe(false)
    })

    it("B6: eliminada y reactivada -> vigente otra vez", async () => {
      const a = await nuevaAsignacion()
      const c = await nuevaClase(a.id, d("2026-10-23"), null)
      await asignacionRepository.softDelete(a.id, institucionId)
      await asignacionRepository.reactivar(a.id, institucionId)
      expect((await condiciones(c.id)).asignacionVigente).toBe(true)
    })

    it("B7: activo=false sin deletedAt -> no vigente para ninguna fecha", async () => {
      const a = await nuevaAsignacion({ activo: false })
      const cPasada = await nuevaClase(a.id, d("2026-03-02"), null)
      const cHoy = await nuevaClase(a.id, d("2026-10-22"), null)
      expect((await condiciones(cPasada.id)).asignacionVigente).toBe(false)
      expect((await condiciones(cHoy.id)).asignacionVigente).toBe(false)
    })
  })

  describe("C — moduloVigente", () => {
    it("C1: versión vieja INACTIVO rige su tramo; la nueva sin el módulo no", async () => {
      const a = await nuevaAsignacion()
      await nuevaDistribucion(a.id, {
        desde: d("2026-03-01"), hasta: new Date("2026-10-21T23:59:59.999Z"),
        modulos: [moduloA], estado: "INACTIVO", activo: false,
      })
      await nuevaDistribucion(a.id, { desde: d("2026-10-22"), modulos: [moduloB] })
      const c21 = await nuevaClase(a.id, d("2026-10-21"), moduloA)
      const c22 = await nuevaClase(a.id, d("2026-10-22"), moduloA)
      const c22b = await nuevaClase(a.id, d("2026-10-22"), moduloB)
      expect((await condiciones(c21.id)).moduloVigente).toBe(true)
      expect((await condiciones(c22.id)).moduloVigente).toBe(false)
      expect((await condiciones(c22b.id)).moduloVigente).toBe(true)
    })

    it("C2: distribución eliminada hoy -> rige el 21/10, no el 22/10", async () => {
      const a = await nuevaAsignacion()
      const dist = await nuevaDistribucion(a.id, { desde: d("2026-03-01"), modulos: [moduloA] })
      const c21 = await nuevaClase(a.id, d("2026-10-21"), moduloA)
      const c22 = await nuevaClase(a.id, d("2026-10-22"), moduloA)
      await distribucionRepository.eliminar(dist.id, institucionId) // deletedAt = 22/10 13:00Z
      expect((await condiciones(c21.id)).moduloVigente).toBe(true)
      expect((await condiciones(c22.id)).moduloVigente).toBe(false)
    })

    it("C3: distribución eliminada y reactivada -> rige otra vez", async () => {
      const a = await nuevaAsignacion()
      const dist = await nuevaDistribucion(a.id, { desde: d("2026-03-01"), modulos: [moduloA] })
      const c = await nuevaClase(a.id, d("2026-10-22"), moduloA)
      await distribucionRepository.eliminar(dist.id, institucionId)
      await distribucionRepository.reactivar(dist.id, institucionId)
      expect((await condiciones(c.id)).moduloVigente).toBe(true)
    })

    it("C4: ninguna distribución cubre la fecha -> no vigente", async () => {
      const a = await nuevaAsignacion()
      await nuevaDistribucion(a.id, { desde: d("2026-11-01"), modulos: [moduloA] })
      const c = await nuevaClase(a.id, d("2026-10-22"), moduloA)
      expect((await condiciones(c.id)).moduloVigente).toBe(false)
    })

    it("C5: clase de jornal (sin módulo) -> vigente sin distribución", async () => {
      const a = await nuevaAsignacion()
      const c = await nuevaClase(a.id, d("2026-10-22"), null)
      expect((await condiciones(c.id)).moduloVigente).toBe(true)
    })

    it("C6: distribución con fecha_vigencia_hasta null -> vigente", async () => {
      const a = await nuevaAsignacion()
      await nuevaDistribucion(a.id, { desde: d("2026-03-01"), hasta: null, modulos: [moduloA] })
      const c = await nuevaClase(a.id, d("2026-12-30"), moduloA)
      expect((await condiciones(c.id)).moduloVigente).toBe(true)
    })
  })

  describe("I — tieneIncidenciaActiva", () => {
    const conIncidencia = async (extra: { activo?: boolean; deletedAt?: Date }) => {
      const a = await nuevaAsignacion()
      const inc = await prisma.incidencia.create({
        data: {
          asignacionId: a.id, codigarioItemId: itemPaga,
          fecha_desde: d("2026-10-23"), fecha_hasta: d("2026-10-23"), ...extra,
        },
      })
      return nuevaClase(a.id, d("2026-10-23"), null, inc.id)
    }

    it("I1: incidencia activa -> true", async () => {
      expect((await condiciones((await conIncidencia({})).id)).tieneIncidenciaActiva).toBe(true)
    })

    it("I2: incidencia eliminada -> false aunque la clase siga vinculada", async () => {
      const c = await conIncidencia({ activo: false, deletedAt: AHORA })
      expect((await condiciones(c.id)).tieneIncidenciaActiva).toBe(false)
    })

    it("I3: incidencia con activo=false -> false", async () => {
      const c = await conIncidencia({ activo: false })
      expect((await condiciones(c.id)).tieneIncidenciaActiva).toBe(false)
    })
  })

  describe("P — articuloPaga", () => {
    const conLicencia = async (codigarioItemId: number, fecha: Date) => {
      const a = await nuevaAsignacion()
      const inc = await prisma.incidencia.create({
        data: { asignacionId: a.id, codigarioItemId, fecha_desde: fecha, fecha_hasta: fecha },
      })
      return nuevaClase(a.id, fecha, null, inc.id)
    }

    it("P1: feriado y artículo al 100% -> true", async () => {
      const r = await condiciones((await conLicencia(itemPaga, d("2026-10-22"))).id)
      expect(r.tieneEventoCalendario).toBe(true)
      expect(r.articuloPaga).toBe(true)
    })

    it("P2: feriado y artículo al 0% -> false", async () => {
      const r = await condiciones((await conLicencia(itemNoPaga, d("2026-10-22"))).id)
      expect(r.tieneEventoCalendario).toBe(true)
      expect(r.articuloPaga).toBe(false)
    })

    it("P3: sin feriado -> null (no se consulta)", async () => {
      const r = await condiciones((await conLicencia(itemNoPaga, d("2026-10-23"))).id)
      expect(r.tieneEventoCalendario).toBe(false)
      expect(r.articuloPaga).toBe(null)
    })

    it("P4: feriado sin incidencia -> null", async () => {
      const a = await nuevaAsignacion()
      const c = await nuevaClase(a.id, d("2026-10-22"), null)
      const r = await condiciones(c.id)
      expect(r.tieneEventoCalendario).toBe(true)
      expect(r.articuloPaga).toBe(null)
    })
  })
})
