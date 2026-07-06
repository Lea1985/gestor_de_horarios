// lib/pdf/datasets/profesores.ts
import prisma from "@/lib/prisma"

export type FilaProfesor = {
  id:        number
  apellido:  string
  nombre:    string
  documento: string
  email:     string | null
  telefono:  string | null
  esPlanta:  boolean   // true = tiene titularidad activa, false = solo suplente
  asignaciones: {
    identificador: string
    materia:       string | null
    comision:      string | null
    turno:         string
  }[]
}

export async function obtenerDatosProfesores(
  tenantId: number,
  filtro:   "todos" | "planta" | "suplentes"
): Promise<FilaProfesor[]> {

  // 1. Todos los agentes activos
  const agentes = await prisma.agente.findMany({
    where: { institucionId: tenantId, activo: true, deletedAt: null },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    select: {
      id:        true,
      nombre:    true,
      apellido:  true,
      documento: true,
      email:     true,
      telefono:  true,
      // Titularidades activas → es planta
      titularidades: {
        where:  { activo: true, fecha_hasta: null, institucionId: tenantId },
        take:   1,
        select: {
          asignacion: {
            select: {
              identificadorEstructural: true,
              materia:  { select: { nombre: true } },
              comision: { select: { nombre: true } },
              turno:    { select: { nombre: true } },
            },
          },
        },
      },
    },
  })

  // 2. Agentes que aparecen como suplentes (puede ser distinto de planta)
  const suplentesIds = new Set(
    (await prisma.reemplazo.findMany({
      where:  { activo: true, agenteSuplente: { institucionId: tenantId } },
      select: { agenteSuplenteId: true },
      distinct: ["agenteSuplenteId"],
    })).map(r => r.agenteSuplenteId)
  )

  // 3. Para agentes de planta, traer todas sus asignaciones vigentes
  const titularidadesCompletas = await prisma.titularAsignacion.findMany({
    where: {
      institucionId: tenantId,
      activo:        true,
      fecha_hasta:   null,
    },
    select: {
      agenteId: true,
      asignacion: {
        select: {
          identificadorEstructural: true,
          materia:  { select: { nombre: true } },
          comision: { select: { nombre: true } },
          turno:    { select: { nombre: true } },
        },
      },
    },
  })

  const asignacionesPorAgente = new Map<number, FilaProfesor["asignaciones"]>()
  for (const t of titularidadesCompletas) {
    if (!asignacionesPorAgente.has(t.agenteId)) {
      asignacionesPorAgente.set(t.agenteId, [])
    }
    asignacionesPorAgente.get(t.agenteId)!.push({
      identificador: t.asignacion.identificadorEstructural,
      materia:       t.asignacion.materia?.nombre ?? null,
      comision:      t.asignacion.comision?.nombre ?? null,
      turno:         t.asignacion.turno.nombre,
    })
  }

  const filas: FilaProfesor[] = agentes.map(a => {
    const esPlanta   = (asignacionesPorAgente.get(a.id)?.length ?? 0) > 0
    const esSuplente = suplentesIds.has(a.id)

    return {
      id:        a.id,
      apellido:  a.apellido,
      nombre:    a.nombre,
      documento: a.documento,
      email:     a.email,
      telefono:  a.telefono,
      esPlanta,
      asignaciones: asignacionesPorAgente.get(a.id) ?? [],
    }
  }).filter(a => {
    if (filtro === "planta")    return a.esPlanta
    if (filtro === "suplentes") return !a.esPlanta
    return true
  })

  return filas
}