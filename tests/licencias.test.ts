// tests/licencias.test.ts
//
// Fase 4 del plan docs/plan-correccion-motor-clases-2026-10-22.md (3.4):
// licencias (Incidencia) y su cadena. Llama a los usecases directo (sin
// servidor HTTP) contra gestor_test, con fixtures propios y limpieza al final.
// Reloj simulado solo para Date: "hoy" es el 27/10/2026 a las 10:00 AR; las
// clases son lunes de noviembre (futuras).

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { randomUUID } from "crypto"
import { Prisma, Causa, EstadoClase } from "@prisma/client"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { incidenciaRepository } from "../lib/repositories/incidenciaRepository"
import {
  crearIncidencia,
  IncidenciaDuplicadaError,
  SinClasesProgramadasError,
} from "../lib/usecases/incidencias/crearIncidencia"
import { listarAsignacionesParaIncidencia } from "../lib/usecases/asignaciones/listarAsignaciones"
import { eliminarIncidencia } from "../lib/usecases/incidencias/eliminarIncidencia"
import {
  actualizarIncidencia,
  SuperposicionError as SuperposicionAlEditarError,
} from "../lib/usecases/incidencias/actualizarIncidencia"
import {
  reactivarIncidencia,
  IncidenciaPadreNoValidaError,
  SuperposicionError as SuperposicionAlReactivarError,
} from "../lib/usecases/incidencias/reactivarIncidencia"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const LUNES = ["2026-11-02", "2026-11-09", "2026-11-16"]

let institucionId: number
let unidadId: number
let turnoId: number
let modulo: number
let item: number

async function asignacionConClases(dias: string[] = LUNES) {
  const a = await prisma.asignacion.create({
    data: { institucionId, unidadId, turnoId, identificadorEstructural: `LIC-${randomUUID()}`, fecha_inicio: d("2026-01-01") },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-03-01") },
  })
  await prisma.distribucionModulo.create({ data: { distribucionHorariaId: dist.id, moduloHorarioId: modulo } })
  const clases: Record<string, number> = {}
  for (const fecha of dias) {
    clases[fecha] = (await prisma.claseProgramada.create({
      data: { institucionId, asignacionId: a.id, unidadId, moduloId: modulo, fecha: d(fecha) },
    })).id
  }
  return { a, clases }
}

const licencia = (asignacionId: number, desde: string, hasta: string, incidenciaPadreId?: number) =>
  crearIncidencia(institucionId, { asignacionId, fecha_desde: desde, fecha_hasta: hasta, codigarioItemId: item, incidenciaPadreId })

const leer = (id: number) => prisma.claseProgramada.findUniqueOrThrow({ where: { id } })

// Inserción directa, sin las validaciones del usecase: prueba el índice.
const insertar = (asignacionId: number, desde: string, incidenciaPadreId: number | null = null) =>
  prisma.incidencia.create({
    data: { asignacionId, fecha_desde: d(desde), fecha_hasta: d("2026-11-16"), codigarioItemId: item, incidenciaPadreId },
  })

async function codigoDeError(p: Promise<unknown>) {
  try { await p } catch (e) {
    return e instanceof Prisma.PrismaClientKnownRequestError ? e.code : String(e)
  }
  return null
}

describe("Licencias — Fase 4", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-27T13:00:00.000Z"))
    institucionId = (await createTestInstitucion()).id
    turnoId = (await prisma.turno.create({
      data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 },
    })).id
    unidadId = (await prisma.unidadOrganizativa.create({
      data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` },
    })).id
    await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO",
        fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-12-31"),
      },
    })
    modulo = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
    })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    item = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "LIC", nombre: "Licencia", porcentajeComputable: 100 },
    })).id
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    // De las hojas hacia la raíz: anular incidenciaPadreId haría chocar en el
    // índice a una hija con su padre del mismo día.
    while ((await prisma.incidencia.deleteMany({
      where: { asignacion: { institucionId }, hijos: { none: {} } },
    })).count > 0) { /* sigue con el nivel de arriba */ }
    await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
    await prisma.codigario.deleteMany({ where: { institucionId } })
    await prisma.titularAsignacion.deleteMany({ where: { institucionId } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.agente.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  describe("índice único parcial (bug 8 y hija del mismo día)", () => {
    it("recargar una licencia con la misma fecha de inicio que una eliminada", async () => {
      const { a, clases } = await asignacionConClases()
      const vieja = await licencia(a.id, "2026-11-02", "2026-11-16")
      await eliminarIncidencia(vieja.id, institucionId)

      const nueva = await licencia(a.id, "2026-11-02", "2026-11-16")

      expect(nueva.id).not.toBe(vieja.id)
      for (const id of Object.values(clases)) {
        expect((await leer(id)).incidenciaId).toBe(nueva.id)
      }
    })

    it("una hija puede empezar el mismo día que su padre", async () => {
      const { a, clases } = await asignacionConClases()
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")

      const hija = await licencia(a.id, "2026-11-02", "2026-11-02", padre.id)

      expect((await leer(clases["2026-11-02"])).incidenciaId).toBe(hija.id)
      expect((await leer(clases["2026-11-09"])).incidenciaId).toBe(padre.id)
    })

    it("el índice rechaza dos vivas del mismo nivel con el mismo inicio y admite las demás", async () => {
      const { a } = await asignacionConClases([])
      const raiz = await insertar(a.id, "2026-11-02")
      // Otra raíz viva el mismo día: duplicada.
      expect(await codigoDeError(insertar(a.id, "2026-11-02"))).toBe("P2002")
      // Hija (otro nivel) el mismo día: admitida; una hermana igual, no.
      await insertar(a.id, "2026-11-02", raiz.id)
      expect(await codigoDeError(insertar(a.id, "2026-11-02", raiz.id))).toBe("P2002")
      // Con la raíz eliminada, otra raíz el mismo día: admitida.
      await prisma.incidencia.update({ where: { id: raiz.id }, data: { activo: false, deletedAt: new Date() } })
      expect(await codigoDeError(insertar(a.id, "2026-11-02"))).toBe(null)
    })

    it("en una carrera (la superposición no la ve), el P2002 sale como IncidenciaDuplicadaError", async () => {
      const { a } = await asignacionConClases()
      await licencia(a.id, "2026-11-02", "2026-11-16")
      vi.spyOn(incidenciaRepository, "verificarSuperposicion").mockResolvedValue(null)

      await expect(licencia(a.id, "2026-11-02", "2026-11-09")).rejects.toBeInstanceOf(IncidenciaDuplicadaError)
    })
  })

  describe("ancestros al editar y reactivar una hija", () => {
    it("editar la observación de una hija no choca con su padre", async () => {
      const { a } = await asignacionConClases()
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")
      const hija = await licencia(a.id, "2026-11-09", "2026-11-09", padre.id)

      const editada = await actualizarIncidencia(hija.id, institucionId, { observacion: "aviso tardío" })

      expect(editada?.observacion).toBe("aviso tardío")
    })

    it("cambiar el rango de una hija dentro de la padre re-vincula sus clases", async () => {
      const { a, clases } = await asignacionConClases()
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")
      const hija = await licencia(a.id, "2026-11-09", "2026-11-09", padre.id)

      await actualizarIncidencia(hija.id, institucionId, { fecha_hasta: "2026-11-16" })

      expect((await leer(clases["2026-11-02"])).incidenciaId).toBe(padre.id)
      expect((await leer(clases["2026-11-09"])).incidenciaId).toBe(hija.id)
      expect((await leer(clases["2026-11-16"])).incidenciaId).toBe(hija.id)
    })

    it("una hija sigue sin poder superponerse con una hermana", async () => {
      const { a } = await asignacionConClases()
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")
      const hija = await licencia(a.id, "2026-11-02", "2026-11-02", padre.id)
      const hermana = await licencia(a.id, "2026-11-16", "2026-11-16", padre.id)

      const error = await actualizarIncidencia(hija.id, institucionId, { fecha_hasta: "2026-11-16" }).catch(e => e)

      expect(error).toBeInstanceOf(SuperposicionAlEditarError)
      expect(error.conflicto.id).toBe(hermana.id)
    })

    it("reactivar una hija vuelve a vincular sus clases", async () => {
      const { a, clases } = await asignacionConClases()
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")
      const hija = await licencia(a.id, "2026-11-09", "2026-11-09", padre.id)
      await eliminarIncidencia(hija.id, institucionId)
      expect((await leer(clases["2026-11-09"])).incidenciaId).toBe(padre.id)

      await reactivarIncidencia(hija.id, institucionId)

      expect((await leer(clases["2026-11-09"])).incidenciaId).toBe(hija.id)
    })

    it("reactivar una hija con la padre eliminada se rechaza", async () => {
      const { a } = await asignacionConClases()
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")
      const hija = await licencia(a.id, "2026-11-09", "2026-11-09", padre.id)
      await eliminarIncidencia(hija.id, institucionId)
      await eliminarIncidencia(padre.id, institucionId)

      await expect(reactivarIncidencia(hija.id, institucionId)).rejects.toBeInstanceOf(IncidenciaPadreNoValidaError)
    })

    it("reactivar una hija que choca con una hermana cargada después se rechaza", async () => {
      const { a } = await asignacionConClases()
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")
      const hija = await licencia(a.id, "2026-11-09", "2026-11-09", padre.id)
      await eliminarIncidencia(hija.id, institucionId)
      await licencia(a.id, "2026-11-09", "2026-11-16", padre.id)

      await expect(reactivarIncidencia(hija.id, institucionId)).rejects.toBeInstanceOf(SuperposicionAlReactivarError)
    })
  })

  describe("una licencia exige clases vivas en el rango", () => {
    const darDeBaja = (claseId: number, causa: Causa) =>
      prisma.claseProgramada.update({ where: { id: claseId }, data: { estado: EstadoClase.SUSPENDIDA, causa } })

    it("un rango con solo clases dadas de baja se rechaza", async () => {
      const { a, clases } = await asignacionConClases()
      await darDeBaja(clases["2026-11-02"], Causa.CAMBIO_DISTRIBUCION)
      await darDeBaja(clases["2026-11-09"], Causa.FIN_ASIGNACION)

      await expect(licencia(a.id, "2026-11-02", "2026-11-09")).rejects.toBeInstanceOf(SinClasesProgramadasError)
      expect(await prisma.incidencia.count({ where: { asignacionId: a.id } })).toBe(0)
    })

    it("con alguna clase viva en el rango se crea y vincula solo las vivas", async () => {
      const { a, clases } = await asignacionConClases()
      await darDeBaja(clases["2026-11-02"], Causa.CAMBIO_DISTRIBUCION)

      const inc = await licencia(a.id, "2026-11-02", "2026-11-09")

      expect((await leer(clases["2026-11-02"])).incidenciaId).toBe(null)
      expect((await leer(clases["2026-11-09"])).incidenciaId).toBe(inc.id)
    })

    it("el wizard no habilita una asignación cuyas clases futuras están todas dadas de baja", async () => {
      const { a: muerta, clases } = await asignacionConClases()
      for (const id of Object.values(clases)) await darDeBaja(id, Causa.CAMBIO_DISTRIBUCION)
      const { a: viva } = await asignacionConClases()

      const lista = await listarAsignacionesParaIncidencia(institucionId)

      expect(lista.find(x => x.id === muerta.id)?.tieneClasesVigentes).toBe(false)
      expect(lista.find(x => x.id === viva.id)?.tieneClasesVigentes).toBe(true)
    })
  })
})
