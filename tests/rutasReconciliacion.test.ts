// tests/rutasReconciliacion.test.ts
//
// Rutas de la Fase 3c: POST /api/distribuciones/[id]/modulos y
// /api/distribuciones/[id]/nueva-version aceptan desde (400 si es inválido) y
// devuelven el aviso de confirmación de la reconciliación (200 con
// requiereConfirmacion, sin aplicar nada).
//
// HTTP contra el servidor de tests (TEST_BASE_URL, puerto 3100 verificado
// contra gestor_test), con el reloj real: las aserciones no dependen de la
// fecha exacta, solo de que la distribución empiece semanas antes de hoy.

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { randomUUID } from "crypto"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, prisma } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"

let headers: Record<string, string>
let institucionId: number
let distribucionId: number
let lunes: number
let martes: number

const hace = (dias: number) => {
  const f = new Date()
  f.setUTCDate(f.getUTCDate() - dias)
  return f.toISOString().slice(0, 10)
}

const post = (ruta: string, body: unknown) =>
  fetch(`${BASE_URL}${ruta}`, { method: "POST", headers, body: JSON.stringify(body) })

describe("rutas de distribución con reconciliación", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    const tenant = await createTestTenant()
    institucionId = tenant.institucionId
    headers = authHeaders(String(institucionId), tenant.token)
    const turno = await prisma.turno.create({ data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 } })
    const unidad = await prisma.unidadOrganizativa.create({ data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` } })
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    const comision = await prisma.comision.create({ data: { institucionId, cursoId: curso.id, turnoId: turno.id, nombre: `Com-${randomUUID()}` } })
    await prisma.periodoOperativo.create({
      data: { institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO", fecha_desde: new Date(hace(60)), fecha_hasta: new Date(hace(-30)) },
    })
    lunes = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 } })).id
    martes = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "MARTES", hora_desde: 480, hora_hasta: 520 } })).id
    const asignacion = await prisma.asignacion.create({
      data: {
        institucionId, unidadId: unidad.id, turnoId: turno.id, comisionId: comision.id,
        identificadorEstructural: `RUTA-${randomUUID()}`, fecha_inicio: new Date(hace(90)),
      },
    })
    distribucionId = (await prisma.distribucionHoraria.create({
      data: { institucionId, asignacionId: asignacion.id, version: 1, fecha_vigencia_desde: new Date(hace(30)) },
    })).id
    const primera = await post(`/distribuciones/${distribucionId}/modulos`, { modulos: [lunes] })
    expect(primera.status).toBe(200)
  })

  afterAll(async () => {
    if (!institucionId) return
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.comision.deleteMany({ where: { institucionId } })
    await prisma.curso.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    const usuarios = (await prisma.usuarioRol.findMany({ where: { institucionId }, select: { usuarioId: true } })).map(u => u.usuarioId)
    await prisma.usuarioRol.deleteMany({ where: { institucionId } })
    await prisma.sesion.deleteMany({ where: { institucionId } })
    if (usuarios.length > 0) {
      await prisma.usuario.deleteMany({ where: { id: { in: usuarios }, roles: { none: {} }, sesiones: { none: {} } } })
    }
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("Editar con desde inválido: 400", async () => {
    const res = await post(`/distribuciones/${distribucionId}/modulos`, { modulos: [martes], desde: "no-es-fecha" })
    expect(res.status).toBe(400)
  })

  it("Editar retroactivo sin confirmar: 200 con requiereConfirmacion y el aviso, sin aplicar nada", async () => {
    const res = await post(`/distribuciones/${distribucionId}/modulos`, { modulos: [martes], desde: hace(30) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.requiereConfirmacion).toBe(true)
    expect(data.aviso.dictadasAReescribir.length).toBeGreaterThan(0)
    expect(data.aviso.clasesPasadasNuevas.length).toBeGreaterThan(0)
    const modulos = await prisma.distribucionModulo.findMany({ where: { distribucionHorariaId: distribucionId } })
    expect(modulos.map(m => m.moduloHorarioId)).toEqual([lunes])
  })

  it("Nueva versión con desde inválido (no posterior al inicio de la actual): 400", async () => {
    const res = await post(`/distribuciones/${distribucionId}/nueva-version`, { desde: hace(60) })
    expect(res.status).toBe(400)
  })
})
