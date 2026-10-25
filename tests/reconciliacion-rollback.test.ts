// tests/reconciliacion-rollback.test.ts
//
// reconciliarAsignacion es atómica: si falla a mitad de camino (acá, el motor
// lanza en la séptima clase que resuelve: después de generar y resolver
// los 5 martes nuevos y de re-resolver el primer lunes), no queda nada aplicado -- ni las
// clases generadas, ni las re-resueltas antes del error.
//
// Archivo aparte porque reemplaza resolverClase con vi.mock (envuelve la
// implementación real y la hace fallar a pedido). Contra gestor_test, reloj
// simulado solo para Date: jueves 22/10/2026, 10:00 AR.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"

const falla = vi.hoisted(() => ({ enLlamada: 0, llamadas: 0 }))

vi.mock("../lib/services/resolucionClaseService", async (importOriginal) => {
  const real = await importOriginal<typeof import("../lib/services/resolucionClaseService")>()
  return {
    ...real,
    resolverClase: async (...args: Parameters<typeof real.resolverClase>) => {
      falla.llamadas++
      if (falla.enLlamada > 0 && falla.llamadas === falla.enLlamada) {
        throw new Error("falla provocada en el motor")
      }
      return real.resolverClase(...args)
    },
  }
})

import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { claseProgramadaService } from "../lib/services/claseProgramadaService"
import { reconciliarAsignacion } from "../lib/services/reconciliacionService"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

let institucionId: number

describe("reconciliarAsignacion — rollback ante un error a mitad de camino", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-22T13:00:00.000Z"))
    institucionId = (await createTestInstitucion()).id
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

  it("no deja clases generadas ni re-resueltas si el motor falla en la séptima resolución", async () => {
    const turnoId = (await prisma.turno.create({
      data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 },
    })).id
    const unidadId = (await prisma.unidadOrganizativa.create({
      data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` },
    })).id
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    const comisionId = (await prisma.comision.create({
      data: { institucionId, cursoId: curso.id, turnoId, nombre: `Com-${randomUUID()}` },
    })).id
    const periodoId = (await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO",
        fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-12-31"),
      },
    })).id
    const lunes = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
    })).id
    const martes = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "MARTES", hora_desde: 480, hora_hasta: 520 },
    })).id
    const asignacion = await prisma.asignacion.create({
      data: {
        institucionId, unidadId, turnoId, comisionId,
        identificadorEstructural: `RBK-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
      },
    })
    const dist = await prisma.distribucionHoraria.create({
      data: { institucionId, asignacionId: asignacion.id, version: 1, fecha_vigencia_desde: d("2026-10-05") },
    })
    await prisma.distribucionModulo.create({ data: { distribucionHorariaId: dist.id, moduloHorarioId: lunes } })
    await claseProgramadaService.generarParaRango({
      institucionId, asignacionId: asignacion.id, unidadId, comisionId,
      distribucionId: dist.id, periodoId, desde: d("2026-10-05"), hasta: d("2026-11-30"),
    })
    const antes = await prisma.claseProgramada.findMany({
      where: { asignacionId: asignacion.id }, orderBy: { id: "asc" },
      select: { id: true, estado: true, causa: true, versionResolucion: true },
    })

    // Cambio de módulo: la reconciliación genera 5 martes (resuelve cada uno,
    // llamadas 1 a 5) y re-resuelve los lunes (6, 7, ...): falla la 7.
    await prisma.distribucionModulo.deleteMany({ where: { distribucionHorariaId: dist.id } })
    await prisma.distribucionModulo.create({ data: { distribucionHorariaId: dist.id, moduloHorarioId: martes } })
    falla.llamadas = 0
    falla.enLlamada = 7
    await expect(reconciliarAsignacion({
      tenantId: institucionId, asignacionId: asignacion.id, desde: d("2026-10-22"), hasta: d("2026-11-30"),
    })).rejects.toThrow("falla provocada en el motor")
    expect(falla.llamadas).toBe(7)

    const despues = await prisma.claseProgramada.findMany({
      where: { asignacionId: asignacion.id }, orderBy: { id: "asc" },
      select: { id: true, estado: true, causa: true, versionResolucion: true },
    })
    expect(despues).toEqual(antes) // ni martes nuevos ni lunes cambiados
  })
})
