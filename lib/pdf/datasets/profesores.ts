// lib/pdf/datasets/profesores.ts
import prisma from "@/lib/prisma"

export type FilaProfesor = {
  id:        number
  apellido:  string
  nombre:    string
  documento: string
  email:     string | null
  telefono:  string | null
  esPlanta:    boolean   // tiene titularidad activa hoy
  esSuplente:  boolean   // hizo al menos un reemplazo activo (no es "no es planta")
  asignaciones: {
    identificador: string
    materia:       string | null
    comision:      string | null
    turno:         string
  }[]
  reemplazosActivos: {
    identificador: string
    materia:       string | null
    comision:      string | null
    turno:         string
    fechaDesde:    string | null
    fechaHasta:    string | null
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

  // 2. Reemplazos activos por agente suplente -- de dónde sale esSuplente
  // y también qué está cubriendo, para no dejar la etiqueta sin detalle.
  const reemplazos = await prisma.reemplazo.findMany({
    where:  { activo: true, agenteSuplente: { institucionId: tenantId } },
    select: {
      agenteSuplenteId: true,
      clase: {
        select: {
          asignacion: {
            select: {
              identificadorEstructural: true,
              materia:  { select: { nombre: true } },
              comision: { select: { nombre: true } },
              turno:    { select: { nombre: true } },
            },
          },
          incidencia: {
            select: { fecha_desde: true, fecha_hasta: true },
          },
        },
      },
    },
  })
  const fmtFecha = (d: Date | null) => d ? d.toISOString().split("T")[0] : null
  const reemplazosPorAgente = new Map<number, FilaProfesor["reemplazosActivos"]>()
  for (const r of reemplazos) {
    if (!r.clase.asignacion) continue
    if (!reemplazosPorAgente.has(r.agenteSuplenteId)) {
      reemplazosPorAgente.set(r.agenteSuplenteId, [])
    }
    const lista      = reemplazosPorAgente.get(r.agenteSuplenteId)!
    const a          = r.clase.asignacion
    const fechaDesde = fmtFecha(r.clase.incidencia?.fecha_desde ?? null)
    const fechaHasta = fmtFecha(r.clase.incidencia?.fecha_hasta ?? null)
    // Evitar duplicados -- un mismo reemplazo puede generar varias
    // ClaseProgramada (una por módulo/día). Se dedupe por asignación +
    // período: si el mismo suplente cubrió la misma asignación en dos
    // períodos distintos, sí queremos verlos como dos filas separadas.
    const yaExiste = lista.some(x =>
      x.identificador === a.identificadorEstructural &&
      x.fechaDesde === fechaDesde && x.fechaHasta === fechaHasta
    )
    if (!yaExiste) {
      lista.push({
        identificador: a.identificadorEstructural,
        materia:       a.materia?.nombre ?? null,
        comision:      a.comision?.nombre ?? null,
        turno:         a.turno.nombre,
        fechaDesde,
        fechaHasta,
      })
    }
  }
  const suplentesIds = new Set(reemplazosPorAgente.keys())

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
      esSuplente,
      asignaciones:      asignacionesPorAgente.get(a.id) ?? [],
      reemplazosActivos: reemplazosPorAgente.get(a.id) ?? [],
    }
  }).filter(a => {
    if (filtro === "planta")    return a.esPlanta
    if (filtro === "suplentes") return a.esSuplente
    return true
  })

  return filas
}