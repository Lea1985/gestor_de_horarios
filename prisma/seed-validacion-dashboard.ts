/**
 * prisma/seed-validacion-dashboard.ts
 *
 * Carga datos operativos deterministas para Escuela N°12, pensados para
 * la Fase 3 (dataset controlado) del plan de validación funcional del
 * Dashboard. Usa los usecases reales (crearDistribucion, asignarModulos,
 * activarPeriodo, crearIncidencia, crearReemplazo) para que el motor de
 * resolución genere los estados -- nada de escribir ClaseProgramada a mano.
 *
 * Requiere: Escuela N°12 ya existe (seed.ts) y sus tablas operativas están
 * vacías (correr el TRUNCATE selectivo antes si no es la primera vez).
 *
 * No es re-corrible sin resetear antes: identificadorEstructural, documento
 * y codigoUnidad son fijos, no UUIDs -- correrlo dos veces sin truncar
 * entre medio va a chocar contra constraints únicos.
 *
 * Ejecución:
 *   node --loader ts-node/esm prisma/seed-validacion-dashboard.ts
 */

import prisma from "../lib/prisma"
import { crearDistribucion } from "../lib/usecases/distribuciones/crearDistribucion"
import { activarPeriodo } from "../lib/usecases/periodosOperativos/activarPeriodo"
import { crearIncidencia } from "../lib/usecases/incidencias/crearIncidencia"
import { crearReemplazo } from "../lib/usecases/reemplazos/crearReemplazo"

async function main() {
  console.log("🌱 Sembrando dataset de validación para Escuela N°12...")

  const escuela = await prisma.institucion.findUniqueOrThrow({
    where: { dominio: "escuela12.edu.ar" },
  })
  const institucionId = escuela.id

  // -----------------------------------------------------------------------
  // ESTRUCTURA BASE: turno, unidades, curso, comisiones
  // -----------------------------------------------------------------------
  const turno = await prisma.turno.create({
    data: { institucionId, nombre: "Mañana", horaInicio: 480, horaFin: 720 }, // 08:00–12:00
  })

  const aula1 = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula 1" },
  })
  const aula2 = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 2, nombre: "Aula 2" },
  })

  const curso = await prisma.curso.create({
    data: { institucionId, nombre: "1er Grado" },
  })
  const comisionA = await prisma.comision.create({
    data: { institucionId, cursoId: curso.id, turnoId: turno.id, unidadId: aula1.id, nombre: "1°A" },
  })
  const comisionB = await prisma.comision.create({
    data: { institucionId, cursoId: curso.id, turnoId: turno.id, unidadId: aula2.id, nombre: "1°B" },
  })

  console.log("✅ Turno, unidades, curso y comisiones creados")

  // -----------------------------------------------------------------------
  // AGENTES: 2 docentes titulares + 1 suplente
  // -----------------------------------------------------------------------
  const docenteA = await prisma.agente.create({
    data: { institucionId, nombre: "Ana", apellido: "Gómez", documento: "DOC-VALID-001", email: "ana.gomez@escuela12.edu.ar" },
  })
  const docenteB = await prisma.agente.create({
    data: { institucionId, nombre: "Luis", apellido: "Pérez", documento: "DOC-VALID-002", email: "luis.perez@escuela12.edu.ar" },
  })
  const suplente = await prisma.agente.create({
    data: { institucionId, nombre: "Marta", apellido: "Suárez", documento: "DOC-VALID-003", email: "marta.suarez@escuela12.edu.ar" },
  })

  console.log("✅ Agentes creados (2 titulares + 1 suplente)")

  // -----------------------------------------------------------------------
  // ASIGNACIONES + TITULARIDADES
  // -----------------------------------------------------------------------
  const asignacionA = await prisma.asignacion.create({
    data: {
      institucionId, unidadId: aula1.id, turnoId: turno.id, comisionId: comisionA.id,
      identificadorEstructural: "ESC12-CARGO-1", fecha_inicio: new Date("2026-01-01"),
    },
  })
  const asignacionB = await prisma.asignacion.create({
    data: {
      institucionId, unidadId: aula2.id, turnoId: turno.id, comisionId: comisionB.id,
      identificadorEstructural: "ESC12-CARGO-2", fecha_inicio: new Date("2026-01-01"),
    },
  })

  await prisma.titularAsignacion.create({
    data: { institucionId, asignacionId: asignacionA.id, agenteId: docenteA.id, fecha_desde: new Date("2026-01-01") },
  })
  await prisma.titularAsignacion.create({
    data: { institucionId, asignacionId: asignacionB.id, agenteId: docenteB.id, fecha_desde: new Date("2026-01-01") },
  })

  console.log("✅ Asignaciones y titularidades creadas")

  // -----------------------------------------------------------------------
  // PERÍODO OPERATIVO (borrador) + DISTRIBUCIONES + MÓDULOS
  // -----------------------------------------------------------------------
  const periodo = await prisma.periodoOperativo.create({
    data: {
      institucionId, nombre: "Validación Dashboard 2026",
      fecha_desde: new Date("2026-07-01"), fecha_hasta: new Date("2026-08-31"),
      estado: "BORRADOR",
    },
  })

  const distA = await crearDistribucion(institucionId, {
    asignacionId: asignacionA.id, version: 1, fecha_vigencia_desde: "2026-07-01",
  })
  const distB = await crearDistribucion(institucionId, {
    asignacionId: asignacionB.id, version: 1, fecha_vigencia_desde: "2026-07-01",
  })

  const moduloLunes = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
  })
  const moduloMiercoles = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "MIERCOLES", hora_desde: 480, hora_hasta: 520 },
  })

  // Asignar módulos mientras el período sigue en BORRADOR (mismo patrón que
  // "Disparador 1" de generacion-clases.test.ts) -- activarPeriodo las genera todas juntas.
  await prisma.distribucionModulo.create({
    data: { distribucionHorariaId: distA.id, moduloHorarioId: moduloLunes.id },
  })
  await prisma.distribucionModulo.create({
    data: { distribucionHorariaId: distB.id, moduloHorarioId: moduloMiercoles.id },
  })

  console.log("✅ Período operativo, distribuciones y módulos creados (aún sin activar)")

  // -----------------------------------------------------------------------
  // ACTIVAR PERÍODO — acá el motor genera todas las ClaseProgramada
  // -----------------------------------------------------------------------
  const resultadoActivacion = await activarPeriodo(institucionId, periodo.id)
  console.log(`✅ Período activado — ${resultadoActivacion.clasesCreadas} clases generadas (PROGRAMADA / NINGUNA)`)

  // -----------------------------------------------------------------------
  // INCIDENCIA sobre Asignación A (docente Ana Gómez), agosto 1–15
  // Cubre los lunes 03/08 y 10/08 → ambas clases pasan a SUSPENDIDA / INCIDENCIA
  // -----------------------------------------------------------------------
  const codigarioDocente = await prisma.codigario.findFirstOrThrow({
    where: { institucionId, nombre: "CODIGARIO DOCENTE" },
  })
  const itemIncidencia = await prisma.codigarioItem.findFirstOrThrow({
    where: { codigarioId: codigarioDocente.id },
    orderBy: { id: "asc" },
  })
  console.log(`ℹ️  Usando CodigarioItem "${itemIncidencia.codigo} — ${itemIncidencia.nombre}" (porcentajeComputable=${itemIncidencia.porcentajeComputable}) para la incidencia`)

  const incidencia = await crearIncidencia(institucionId, {
    asignacionId: asignacionA.id,
    fecha_desde: "2026-08-01",
    fecha_hasta: "2026-08-15",
    codigarioItemId: itemIncidencia.id,
    observacion: "Incidencia de prueba — dataset de validación del Dashboard",
  })
  console.log(`✅ Incidencia creada (id=${incidencia.id}) — debería suspender 2 clases (03/08 y 10/08)`)

  // -----------------------------------------------------------------------
  // REEMPLAZO sobre la clase del 03/08 → esa clase pasa a REEMPLAZADA
  // La del 10/08 queda SUSPENDIDA (incidencia sin cubrir)
  // -----------------------------------------------------------------------
  const claseAReemplazar = await prisma.claseProgramada.findFirstOrThrow({
    where: { asignacionId: asignacionA.id, fecha: new Date("2026-08-03") },
  })

const reemplazo = await crearReemplazo(institucionId, {
  claseId: claseAReemplazar.id,
  asignacionTitularId: asignacionA.id,
  agenteSuplenteId: suplente.id,
  incidenciaId: incidencia.id,
  observacion: "Reemplazo de prueba — dataset de validación del Dashboard",
})
if (!reemplazo) {
  throw new Error("crearReemplazo devolvió null — no se creó el reemplazo esperado sobre la clase del 03/08")
}
console.log(`✅ Reemplazo creado (id=${reemplazo.id}) sobre la clase del 03/08 — debería quedar REEMPLAZADA`)

  // -----------------------------------------------------------------------
  // RESUMEN
  // -----------------------------------------------------------------------
  const resumen = await prisma.claseProgramada.groupBy({
    by: ["estado", "causa"],
    where: { institucionId },
    _count: true,
  })

  console.log("\n🎉 Dataset de validación completo")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Docentes: Ana Gómez (Asignación A, con incidencia+reemplazo), Luis Pérez (Asignación B, sin incidentes)")
  console.log("Suplente: Marta Suárez")
  console.log("Distribución de estados/causas en ClaseProgramada:")
  console.table(resumen.map(r => ({ estado: r.estado, causa: r.causa, cantidad: r._count })))
  console.log("Nota: no hay clases en estado DICTADA — no existe ningún flujo actual que las genere (hallazgo, no error del script).")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => {
    console.error("❌ Error sembrando dataset de validación:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })