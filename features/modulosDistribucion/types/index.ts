// features/modulosDistribucion/types/index.ts
export type Modulo = {
  id:         number
  dia_semana: string
  hora_desde: number
  hora_hasta: number
}
export type Distribucion = {
  id:      number
  version: number
  estado:  string
  asignacion: {
    identificadorEstructural: string
    titularidades?: { agente: { nombre: string; apellido: string } }[]
    // UX-DIS-004 — null cuando la asignación es un cargo no-frente-a-curso
    // (preceptor/secretario/director): se paga por jornal, no por módulo.
    // Ya se filtra por esto en Dashboard (#77/#78) y reportes de
    // liquidación (#79/#80); acá se usa solo para avisar en pantalla.
    materia?: { nombre: string } | null
  }
  distribucionModulos: { moduloHorarioId: number }[]
}
export const ORDEN_DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]
export const LABEL_DIAS: Record<string, string> = {
  LUNES:     "Lunes",
  MARTES:    "Martes",
  MIERCOLES: "Miércoles",
  JUEVES:    "Jueves",
  VIERNES:   "Viernes",
  SABADO:    "Sábado",
  DOMINGO:   "Domingo",
}
// Reemplaza a IncidenciaAfectada: antes se evaluaba por incidencia
// individual, ahora se evalúa el tramo exacto de fechas que se va a
// recrear/eliminar en la distribución.
export type TramoReemplazo = {
  desde:               string
  hasta:               string
  totalClases:         number
  clasesConReemplazo:  number
  migrable:            boolean
  suplente: {
    asignacionTitularId: number
    agenteSuplenteId:    number
    nombre:              string
  } | null
}