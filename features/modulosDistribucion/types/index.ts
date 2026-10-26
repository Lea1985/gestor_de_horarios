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
  fecha_vigencia_desde: string
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
// Aviso de la reconciliación (lib/services/reconciliacionService.ts): lo
// que el cambio iba a producir y requiere confirmación. Nada se aplicó.
export type ClaseAfectada = { claseId: number; fecha: string; moduloId: number | null }
export type AvisoReconciliacion = {
  reemplazosAAnular:   (ClaseAfectada & { reemplazoId: number; agenteSuplenteId: number; suplente: string; incidenciaId: number | null })[]
  dictadasAReescribir: ClaseAfectada[]
  pasadasAReescribir:  ClaseAfectada[]
  reemplazadasPasadas: number
  clasesPasadasNuevas: ClaseAfectada[]
}
// Opciones de "Editar" y "Nueva versión" (body de las rutas).
export type OpcionesReconciliacion = {
  desde?:              string
  confirmarAnulacion?: boolean
  reescribirPasado?:   boolean
  mantenerReemplazo?:  boolean
}
