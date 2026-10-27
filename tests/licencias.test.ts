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
import { listarIncidencias } from "../lib/usecases/incidencias/listarIncidencias"
import { obtenerIncidencia } from "../lib/usecases/incidencias/obtenerIncidencia"
import { obtenerCoberturaPorTramos } from "../lib/usecases/incidencias/obtenerCoberturaPorTramos"
import { crearReemplazo, AutoReemplazoError } from "../lib/usecases/reemplazos/crearReemplazo"
import { eliminarReemplazo } from "../lib/usecases/reemplazos/eliminarReemplazo"
import { reasignarReemplazoAIncidencia } from "../lib/usecases/reemplazos/reasignarReemplazoAIncidencia"
import { reanudarEnClases } from "../lib/helpers/reemplazoPausado"
import { obtenerDatosProfesor } from "../lib/pdf/datasets/profesor"
import { coincideBusqueda } from "../features/incidencias/utils/coincideBusqueda"
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
let titularX: number
let lelli: number
let cubre: number
let otro: number

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
    const agente = async (apellido: string) => (await prisma.agente.create({
      data: {
        institucionId, nombre: "Ag", apellido,
        documento: `DOC-${randomUUID()}`, email: `ag-${randomUUID()}@test.dev`, estado: "ACTIVO",
      },
    })).id
    titularX = await agente("TitularX")
    lelli = await agente("Lelli")
    cubre = await agente("Cubre")
    otro = await agente("Otro")
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

  // ── B: licencias encadenadas y reemplazos en pausa ────────────────────────
  // X titular de licencia (padre), Lelli lo reemplaza los tres lunes. Lelli
  // falta el lunes D = 09/11 (hija). Cubre reemplaza a Lelli ese día.
  describe("Licencias encadenadas — reemplazos en pausa (B)", () => {
    const D = "2026-11-09"
    const fila = (claseId: number) => prisma.claseProgramada.findUniqueOrThrow({
      where: { id: claseId }, include: { reemplazos: { orderBy: { id: "asc" } } },
    })
    const estadoDe = async (claseId: number) => {
      const c = await fila(claseId)
      return {
        estado: c.estado, causa: c.causa, incidenciaId: c.incidenciaId,
        reemplazos: c.reemplazos.map(r => ({
          agente: r.agenteSuplenteId, incidenciaId: r.incidenciaId,
          estado: r.activo ? "activo" : r.deletedAt === null ? "pausado" : "quitado",
        })),
      }
    }
    const suplenteEnCobertura = async (incidenciaId: number, fecha: string) =>
      (await obtenerCoberturaPorTramos(incidenciaId, institucionId))
        .find(t => t.desde <= fecha && fecha <= t.hasta)?.suplente?.id ?? null

    // Padre con Lelli cubriendo los tres lunes; titular X.
    async function cadenaConLelli() {
      const { a, clases } = await asignacionConClases()
      await prisma.titularAsignacion.create({
        data: { institucionId, asignacionId: a.id, agenteId: titularX, fecha_desde: d("2026-01-01") },
      })
      const padre = await licencia(a.id, "2026-11-02", "2026-11-16")
      for (const id of Object.values(clases)) {
        await crearReemplazo(institucionId, { claseId: id, asignacionTitularId: a.id, agenteSuplenteId: lelli })
      }
      return { a, clases, padre }
    }
    // Secuencia de "Ausencia del suplente" (ModalAusenciaSuplente): crea la
    // hija y, si se eligió suplente nuevo, reasigna cada clase PROGRAMADA o
    // REEMPLAZADA de la hija (hoy el modal usa reasignar; también se prueba
    // con crearReemplazo desde el detalle).
    async function ausenciaDelSuplente(
      a: { id: number }, padreId: number, desde: string, hasta: string,
      suplenteNuevo: number | null, via: "reasignar" | "crear" = "reasignar",
    ) {
      const hija = await licencia(a.id, desde, hasta, padreId)
      if (suplenteNuevo !== null) {
        const clasesHija = await prisma.claseProgramada.findMany({ where: { incidenciaId: hija.id } })
        for (const c of clasesHija.filter(c => c.estado === "PROGRAMADA" || c.estado === "REEMPLAZADA" || c.estado === "SUSPENDIDA")) {
          if (via === "reasignar") {
            await reasignarReemplazoAIncidencia(institucionId, {
              claseId: c.id, nuevaIncidenciaId: hija.id, asignacionTitularId: a.id, agenteSuplenteId: suplenteNuevo,
            })
          } else {
            await crearReemplazo(institucionId, { claseId: c.id, asignacionTitularId: a.id, agenteSuplenteId: suplenteNuevo })
          }
        }
      }
      return hija
    }

    it("crear la hija pausa el reemplazo de Lelli en D y la clase queda SUSPENDIDA hasta que alguien la cubra", async () => {
      const { a, clases, padre } = await cadenaConLelli()

      const hija = await licencia(a.id, D, D, padre.id)

      expect(await estadoDe(clases[D])).toEqual({
        estado: "SUSPENDIDA", causa: "INCIDENCIA", incidenciaId: hija.id,
        reemplazos: [{ agente: lelli, incidenciaId: padre.id, estado: "pausado" }],
      })
      // Los otros días, sin cambios.
      expect((await estadoDe(clases["2026-11-02"])).reemplazos[0].estado).toBe("activo")
      expect((await fila(clases["2026-11-16"])).estado).toBe("REEMPLAZADA")
    })

    for (const via of ["reasignar", "crear"] as const) {
      it(`hija con cobertura (modal + ${via}): Cubre cubre D, Lelli queda en pausa y la padre la sigue mostrando`, async () => {
        const { a, clases, padre } = await cadenaConLelli()

        const hija = await ausenciaDelSuplente(a, padre.id, D, D, cubre, via)

        expect(await estadoDe(clases[D])).toEqual({
          estado: "REEMPLAZADA", causa: "INCIDENCIA", incidenciaId: hija.id,
          reemplazos: [
            { agente: lelli, incidenciaId: padre.id, estado: "pausado" },
            { agente: cubre, incidenciaId: hija.id, estado: "activo" },
          ],
        })
        expect(await suplenteEnCobertura(padre.id, D)).toBe(lelli)
        expect(await suplenteEnCobertura(padre.id, "2026-11-02")).toBe(lelli)
        expect(await suplenteEnCobertura(hija.id, D)).toBe(cubre)
        expect((await obtenerIncidencia(hija.id, institucionId)).agenteMostrado?.apellido).toBe("Lelli")
      })
    }

    it("hija sin cobertura (modal sin suplente nuevo): D SUSPENDIDA, la padre muestra a Lelli y la hija a nadie", async () => {
      const { a, clases, padre } = await cadenaConLelli()

      const hija = await ausenciaDelSuplente(a, padre.id, D, D, null)

      expect((await fila(clases[D])).estado).toBe("SUSPENDIDA")
      expect(await suplenteEnCobertura(padre.id, D)).toBe(lelli)
      expect(await suplenteEnCobertura(hija.id, D)).toBe(null)
      const enListado = (await listarIncidencias(institucionId)).find(i => i.id === hija.id)
      expect(enListado?.agenteMostrado?.apellido).toBe("Lelli")
    })

    it("A: quitar el reemplazo de la hija deja D SUSPENDIDA y la hija se sigue encontrando por Lelli", async () => {
      // Antes de la Fase 4, tras quitar a Cubre la hija figuraba con Cubre como
      // ausente: la búsqueda por Lelli (o por X) no la encontraba.
      const { a, clases, padre } = await cadenaConLelli()
      const hija = await ausenciaDelSuplente(a, padre.id, D, D, cubre)
      const deCubre = await prisma.reemplazo.findFirstOrThrow({ where: { claseId: clases[D], activo: true } })

      await eliminarReemplazo(deCubre.id, institucionId)

      expect(await estadoDe(clases[D])).toEqual({
        estado: "SUSPENDIDA", causa: "INCIDENCIA", incidenciaId: hija.id,
        reemplazos: [
          { agente: lelli, incidenciaId: padre.id, estado: "pausado" },
          { agente: cubre, incidenciaId: hija.id, estado: "quitado" },
        ],
      })
      expect(await suplenteEnCobertura(padre.id, D)).toBe(lelli)
      const enListado = (await listarIncidencias(institucionId)).find(i => i.id === hija.id)!
      expect(enListado.agenteMostrado?.apellido).toBe("Lelli")
      expect(coincideBusqueda(enListado, "lelli")).toBe(true)
      expect(coincideBusqueda(enListado, "cubre")).toBe(false)
      // El buscador mira el ausente, no el titular: la hija no aparece por X
      // (la padre sí). Filtro por profesor: Fase 6.
      expect(coincideBusqueda(enListado, "titularx")).toBe(false)
    })

    it("eliminar la hija sin cobertura reanuda a Lelli en D (REEMPLAZADA de la padre); reactivarla la vuelve a pausar", async () => {
      const { a, clases, padre } = await cadenaConLelli()
      const hija = await ausenciaDelSuplente(a, padre.id, D, D, cubre)
      const deCubre = await prisma.reemplazo.findFirstOrThrow({ where: { claseId: clases[D], activo: true } })
      await eliminarReemplazo(deCubre.id, institucionId)

      await eliminarIncidencia(hija.id, institucionId)

      expect(await estadoDe(clases[D])).toEqual({
        estado: "REEMPLAZADA", causa: "INCIDENCIA", incidenciaId: padre.id,
        reemplazos: [
          { agente: lelli, incidenciaId: padre.id, estado: "activo" },
          { agente: cubre, incidenciaId: hija.id, estado: "quitado" },
        ],
      })

      await reactivarIncidencia(hija.id, institucionId)

      const c = await estadoDe(clases[D])
      expect([c.estado, c.incidenciaId, c.reemplazos[0].estado]).toEqual(["SUSPENDIDA", hija.id, "pausado"])
    })

    it("Lelli no puede cubrirse a sí misma en D (ni creando ni reasignando el reemplazo)", async () => {
      const { a, clases, padre } = await cadenaConLelli()
      const hija = await ausenciaDelSuplente(a, padre.id, D, D, null)

      await expect(crearReemplazo(institucionId, {
        claseId: clases[D], asignacionTitularId: a.id, agenteSuplenteId: lelli,
      })).rejects.toBeInstanceOf(AutoReemplazoError)
      await expect(reasignarReemplazoAIncidencia(institucionId, {
        claseId: clases[D], nuevaIncidenciaId: hija.id, asignacionTitularId: a.id, agenteSuplenteId: lelli,
      })).rejects.toBeInstanceOf(AutoReemplazoError)
    })

    it("tres niveles: la nieta pausa a Cubre; al eliminarla vuelve Cubre (no Lelli); al eliminar la hija vuelve Lelli", async () => {
      const { a, clases, padre: abuela } = await cadenaConLelli()
      const hija = await ausenciaDelSuplente(a, abuela.id, D, D, cubre)

      // Cubre también falta en D: nieta, cubierta por Otro.
      const nieta = await ausenciaDelSuplente(a, hija.id, D, D, otro)

      expect(await estadoDe(clases[D])).toEqual({
        estado: "REEMPLAZADA", causa: "INCIDENCIA", incidenciaId: nieta.id,
        reemplazos: [
          { agente: lelli, incidenciaId: abuela.id, estado: "pausado" },
          { agente: cubre, incidenciaId: hija.id, estado: "pausado" },
          { agente: otro, incidenciaId: nieta.id, estado: "activo" },
        ],
      })
      expect((await obtenerIncidencia(nieta.id, institucionId)).agenteMostrado?.apellido).toBe("Cubre")
      expect(await suplenteEnCobertura(abuela.id, D)).toBe(lelli)
      expect(await suplenteEnCobertura(hija.id, D)).toBe(cubre)
      expect(await suplenteEnCobertura(nieta.id, D)).toBe(otro)

      // La nieta, sin su cobertura, se elimina: vuelve Cubre, Lelli sigue en pausa.
      const deOtro = await prisma.reemplazo.findFirstOrThrow({ where: { claseId: clases[D], activo: true } })
      await eliminarReemplazo(deOtro.id, institucionId)
      await eliminarIncidencia(nieta.id, institucionId)

      let c = await estadoDe(clases[D])
      expect([c.estado, c.incidenciaId]).toEqual(["REEMPLAZADA", hija.id])
      expect(c.reemplazos.map(r => r.estado)).toEqual(["pausado", "activo", "quitado"])

      // Luego la hija (sin cobertura: se quita a Cubre): vuelve Lelli.
      const deCubre = await prisma.reemplazo.findFirstOrThrow({ where: { claseId: clases[D], activo: true } })
      await eliminarReemplazo(deCubre.id, institucionId)
      await eliminarIncidencia(hija.id, institucionId)

      c = await estadoDe(clases[D])
      expect([c.estado, c.incidenciaId]).toEqual(["REEMPLAZADA", abuela.id])
      expect(c.reemplazos.map(r => r.estado)).toEqual(["activo", "quitado", "quitado"])
    })

    it("reanudarEnClases no actúa sobre una clase dada de baja ni sobre una con otro reemplazo activo", async () => {
      const { a, clases, padre } = await cadenaConLelli()
      // Dos días en pausa (hija del 09 al 16), y la clase vuelve a la padre "a
      // mano" para llamar al helper aislado.
      const hija = await licencia(a.id, D, "2026-11-16", padre.id)
      const muerta = clases[D]
      const conOtro = clases["2026-11-16"]
      await prisma.claseProgramada.updateMany({ where: { id: { in: [muerta, conOtro] } }, data: { incidenciaId: padre.id } })
      await prisma.claseProgramada.update({ where: { id: muerta }, data: { estado: "SUSPENDIDA", causa: Causa.CAMBIO_DISTRIBUCION } })
      await prisma.reemplazo.create({
        data: { claseId: conOtro, asignacionTitularId: a.id, agenteSuplenteId: otro, incidenciaId: hija.id },
      })

      expect(await reanudarEnClases([muerta, conOtro])).toBe(0)

      expect((await estadoDe(muerta)).reemplazos).toEqual([{ agente: lelli, incidenciaId: padre.id, estado: "pausado" }])
      expect((await estadoDe(conOtro)).reemplazos.map(r => r.estado)).toEqual(["pausado", "activo"])
    })

    it("reporte del profesor: el día en pausa no cuenta como clase dada por Lelli; sí por Cubre", async () => {
      const { a, padre } = await cadenaConLelli()
      await ausenciaDelSuplente(a, padre.id, D, D, cubre)

      const fechas = async (agenteId: number) =>
        (await obtenerDatosProfesor(institucionId, agenteId))!.reemplazosComoSuplente
          .filter(r => r.asignacion === a.identificadorEstructural)
          .map(r => r.fecha.toISOString().slice(0, 10)).sort()

      expect(await fechas(lelli)).toEqual(["2026-11-02", "2026-11-16"])
      expect(await fechas(cubre)).toEqual([D])
    })
  })
})
