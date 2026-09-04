// lib/reporting/datasets/obtenerClasesOperativas.ts
import prisma from "@/lib/prisma"
import { CoberturaEstado } from "../transformers/calcularCobertura"
export type ClaseOperativa = {
  id: number
  fecha: Date
  estado: string
  causa: string
  coberturaEstado: CoberturaEstado
  unidad: {
    id: number
    nombre: string
  } | null
  comision: {
    id: number
    nombre: string
  } | null
  asignacion: {
    id: number
    identificadorEstructural: string
    materia: {
      nombre: string
    } | null
  } | null
  titular: {
    nombre: string
    apellido: string
  } | null
  incidencia: {
    id: number
    observacion: string | null
    articulo: string | null
  } | null
  reemplazoActivo: boolean
  suplente: {
    nombre: string
    apellido: string
  } | null
  modulo: {
    hora_desde: number
    hora_hasta: number
  } | null
}
type Agente = { nombre: string; apellido: string }
/**
 * Busca, dentro del historial de titularidades de una asignación, quién
 * era el titular vigente en una fecha puntual (no simplemente el más
 * reciente / actualmente activo).
 */
function titularVigenteEn(
  titularidades: { fecha_desde: Date; fecha_hasta: Date | null; agente: Agente | null }[],
  fecha: Date
): Agente | null {
  const vigente = titularidades.find(
    t => t.fecha_desde <= fecha && (!t.fecha_hasta || t.fecha_hasta >= fecha)
  )
  return vigente?.agente ?? null
}
/**
 * Trae las clases programadas de un rango de fechas con su estado de
 * cobertura calculado. Sirve tanto para el timeline (rango de varios días)
 * como para el resumen de "hoy" (rango de un solo día), evitando duplicar
 * la query en dos funciones distintas.
 */
export async function obtenerClasesOperativas(
  tenantId: number,
  desde: Date,
  hasta: Date
): Promise<ClaseOperativa[]> {
  const clases = await prisma.claseProgramada.findMany({
    where: {
      institucionId: tenantId,
      fecha: { gte: desde, lte: hasta },
    },
    orderBy: [{ fecha: "asc" }],
    include: {
      unidad: {
        select: { id: true, nombre: true },
      },
      comision: {
        select: { id: true, nombre: true },
      },
      modulo: {
        select: { hora_desde: true, hora_hasta: true },
      },
      asignacion: {
        select: {
          id: true,
          identificadorEstructural: true,
          materia: {
            select: { nombre: true },
          },
          titularidades: {
            orderBy: { fecha_desde: "desc" },
            select: {
              fecha_desde: true,
              fecha_hasta: true,
              agente: { select: { nombre: true, apellido: true } },
            },
          },
        },
      },
      incidencia: {
        select: {
          id: true,
          observacion: true,
          codigarioItem: { select: { codigo: true } },
        },
      },
      reemplazos: {
        where: { activo: true },
        select: {
          agenteSuplente: { select: { nombre: true, apellido: true } },
        },
      },
    },
  })
  return clases.map(clase => {
    const titular   = clase.asignacion ? titularVigenteEn(clase.asignacion.titularidades, clase.fecha) : null
    const reemplazo = clase.reemplazos?.[0] ?? null
    const suplente  = reemplazo?.agenteSuplente ?? null
    const coberturaEstado: CoberturaEstado =
      clase.estado === "SUSPENDIDA"
        ? clase.causa === "INCIDENCIA"
          ? "SIN_COBERTURA" // suspendida por una incidencia real, sin reemplazo -- esto es lo que hay que cubrir
          : "SUSPENDIDA"    // suspendida por otro motivo (feriado, período operativo, etc.) -- no hay nada que cubrir
        : reemplazo
        ? "REEMPLAZADA"
        : "NORMAL"          // DICTADA o PROGRAMADA -- cubierta, tenga o no un vínculo histórico a una incidencia
    return {
      id:     clase.id,
      fecha:  clase.fecha,
      estado: clase.estado,
      causa:  clase.causa,
      coberturaEstado,
      unidad:   clase.unidad,
      comision: clase.comision,
      modulo: clase.modulo
        ? { hora_desde: clase.modulo.hora_desde, hora_hasta: clase.modulo.hora_hasta }
        : null,
      asignacion: clase.asignacion
        ? {
            id: clase.asignacion.id,
            identificadorEstructural: clase.asignacion.identificadorEstructural,
            materia: clase.asignacion.materia
              ? { nombre: clase.asignacion.materia.nombre }
              : null,
          }
        : null,
      titular,
      incidencia: clase.incidencia
        ? {
            id:          clase.incidencia.id,
            observacion: clase.incidencia.observacion,
            articulo:    clase.incidencia.codigarioItem?.codigo ?? null,
          }
        : null,
      reemplazoActivo: !!reemplazo,
      suplente,
    }
  })
}
/**
 * Atajo para obtener las clases operativas de hoy (rango de un solo día).
 * Usa UTC explícito porque ClaseProgramada.fecha se guarda como medianoche
 * UTC -- si se usara la timezone local del proceso (setHours en vez de
 * setUTCHours), el rango de "hoy" se correría un día entero en cualquier
 * entorno donde el servidor no corra en TZ=UTC.
 */
export async function obtenerClasesOperativasHoy(
  tenantId: number
): Promise<ClaseOperativa[]> {
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setUTCDate(manana.getUTCDate() + 1)
  manana.setUTCMilliseconds(manana.getUTCMilliseconds() - 1)
  return obtenerClasesOperativas(tenantId, hoy, manana)
}
export type ClaseSinCobertura = {
  claseId:       number
  incidenciaId:  number | null
  unidad:        string | null
  comision:      string | null
  materia:       string | null
  identificador: string | null
  titular:       string
  articulo:      string | null
}
export type ClaseReemplazoActivo = {
  claseId:       number
  incidenciaId:  number | null
  unidad:        string | null
  comision:      string | null
  materia:       string | null
  identificador: string | null
  titular:       string
  suplente:      string
}
/**
 * Mapea clases operativas (típicamente las de hoy) a las dos listas que
 * consumen tanto el Dashboard en pantalla como el PDF exportado: clases
 * sin cobertura y reemplazos activos. Antes esta lógica vivía duplicada
 * en app/api/dashboard/overview/route.ts y lib/pdf/datasets/dashboard.ts
 * -- centralizada acá para que ambos compartan exactamente el mismo
 * criterio (si se corrige algo, se corrige una sola vez).
 */
export function mapearCoberturaHoy(clasesHoy: ClaseOperativa[]): {
  sinCobertura: ClaseSinCobertura[]
  reemplazosActivos: ClaseReemplazoActivo[]
} {
const sinCobertura = clasesHoy
    .filter(c => c.coberturaEstado === "SIN_COBERTURA")
    .map(c => ({
      claseId:       c.id,
      incidenciaId:  c.incidencia?.id ?? null,
      unidad:        c.unidad?.nombre ?? null,
      comision:      c.comision?.nombre ?? null,
      materia:       c.asignacion?.materia?.nombre ?? null,
      identificador: c.asignacion?.identificadorEstructural ?? null,
      titular:       c.titular ? `${c.titular.apellido}, ${c.titular.nombre}` : "Vacante",
      articulo:      c.incidencia?.articulo ?? null,
    }))
  const reemplazosActivos = clasesHoy
    .filter(c => c.coberturaEstado === "REEMPLAZADA")
    .map(c => ({
      claseId:       c.id,
      incidenciaId:  c.incidencia?.id ?? null,
      unidad:        c.unidad?.nombre ?? null,
      comision:      c.comision?.nombre ?? null,
      materia:       c.asignacion?.materia?.nombre ?? null,
      identificador: c.asignacion?.identificadorEstructural ?? null,
      titular:       c.titular ? `${c.titular.apellido}, ${c.titular.nombre}` : "Vacante",
      suplente:      c.suplente ? `${c.suplente.apellido}, ${c.suplente.nombre}` : "—",
    }))
  return { sinCobertura, reemplazosActivos }
}
/**
 * Filtra las clases operativas a solo las de cargos frente a curso (con
 * materia asociada). Las métricas de cobertura de aula (% de cobertura
 * institucional, "sin cobertura hoy", "reemplazos activos hoy") no
 * tienen sentido para cargos no-frente-a-curso (preceptor, secretario,
 * director -- asignación sin materia, típicamente sobre una unidad tipo
 * ADMIN): esos cargos se pagan por jornal, no por módulo, y su ausencia
 * no "descubre" un aula.
 *
 * OJO: NO usar este filtro en /clases (gestión general de clases) ni en
 * ningún otro lugar que no sea específicamente una métrica de cobertura
 * de aula -- esas clases siguen siendo registros operativos reales que
 * hay que poder ver y gestionar (asignar reemplazo, etc.), simplemente
 * no cuentan para "cobertura de aula".
 */
export function filtrarFrenteACurso(clases: ClaseOperativa[]): ClaseOperativa[] {
  return clases.filter(c => c.asignacion?.materia != null)
}
export type PersonalNoDocenteHoy = {
  asignacionId: number
  agente:       string
  cargo:        string | null
  estado:       "presente" | "reemplazado" | "sin_cobertura"
  suplente:     string | null
  incidenciaId: number | null
}
/**
 * Espejo de mapearCoberturaHoy, pero para cargos no-frente-a-curso
 * (preceptor/secretario/director -- asignación sin materia). A diferencia
 * de un aula, acá no interesa "% de cobertura" sino simplemente si la
 * persona está presente hoy o no -- por eso colapsa los módulos de hoy de
 * cada asignación a un único estado (misma prioridad que el resto del
 * sistema: sin_cobertura > reemplazada > normal), y omite del todo los
 * días sin nada que reportar (SUSPENDIDA por cualquier causa -- feriado o
 * hueco de período operativo: ninguno de los dos implica que haya que
 * hacer algo hoy).
 */
export function mapearPersonalNoDocenteHoy(clasesHoy: ClaseOperativa[]): PersonalNoDocenteHoy[] {
  const noFrenteACurso = clasesHoy.filter(c => c.asignacion != null && c.asignacion.materia == null)
  const porAsignacion = new Map<number, ClaseOperativa[]>()
  for (const c of noFrenteACurso) {
    const id = c.asignacion!.id
    const arr = porAsignacion.get(id) ?? []
    arr.push(c)
    porAsignacion.set(id, arr)
  }
  const prioridad: Record<CoberturaEstado, number> = {
    SIN_COBERTURA: 3,
    REEMPLAZADA:   2,
    NORMAL:        1,
    SUSPENDIDA:    0,
  }
  const resultado: PersonalNoDocenteHoy[] = []
  for (const [asignacionId, clases] of porAsignacion) {
    const relevantes = clases.filter(c => c.coberturaEstado !== "SUSPENDIDA")
    if (relevantes.length === 0) continue // feriado o hueco de período operativo -- nada que reportar hoy
    const ganadora = relevantes.reduce((mejor, actual) =>
      prioridad[actual.coberturaEstado] > prioridad[mejor.coberturaEstado] ? actual : mejor
    )
    const estado: PersonalNoDocenteHoy["estado"] =
      ganadora.coberturaEstado === "SIN_COBERTURA" ? "sin_cobertura" :
      ganadora.coberturaEstado === "REEMPLAZADA"   ? "reemplazado"   :
                                                       "presente"
    resultado.push({
      asignacionId,
      agente:       ganadora.titular ? `${ganadora.titular.apellido}, ${ganadora.titular.nombre}` : "Vacante",
      cargo:        ganadora.unidad?.nombre ?? null,
      estado,
      suplente:     ganadora.suplente ? `${ganadora.suplente.apellido}, ${ganadora.suplente.nombre}` : null,
      incidenciaId: ganadora.incidencia?.id ?? null,
    })
  }
  return resultado.sort((a, b) => a.agente.localeCompare(b.agente))
}