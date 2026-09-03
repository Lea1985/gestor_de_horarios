// features/distribuciones/types/index.ts
// Tipos de dominio de la feature Distribuciones.
// Extraídos de app/protected/dashboard/distribuciones/page.tsx — paso 1.
export type Distribucion = {
  id:                   number
  asignacionId:         number
  version:              number
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string | null
  estado:               string
  // UX-DIS-011/151: calculados en el backend (listarDistribuciones.ts /
  // obtenerDistribucion.ts) -- la UI los usa para deshabilitar "Eliminar"
  // de forma proactiva en vez de dejar que el usuario lo intente y falle.
  puedeEliminar:          boolean
  motivoBloqueoEliminar:  string | null
  _count: { distribucionModulos: number }
  distribucionModulos: { moduloHorario: { dia_semana: string } }[]
  asignacion: {
    identificadorEstructural: string
    titularidades?: { agente: { nombre: string; apellido: string } }[]
    curso?:  { nombre: string } | null
    turno?:  { nombre: string } | null
  }
}
export type Asignacion = {
  id: number
  identificadorEstructural: string
  titularidades: { agente: { nombre: string; apellido: string } }[]
  curso:   { nombre: string } | null
  turno:   { nombre: string } | null
  materia: { nombre: string } | null
}
export type DistribucionFormData = {
  asignacionId:         string
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string
}
export const FORM_VACIO: DistribucionFormData = {
  asignacionId:         "",
  fecha_vigencia_desde: "",
  fecha_vigencia_hasta: "",
}
export type IncidenciaAfectada = {
  incidenciaId: number
  fecha_desde: string
  fecha_hasta: string
  codigario: string | null
  observacion: string | null
  totalClasesConReemplazo: number
  migrable: boolean
  suplente: { asignacionTitularId: number; agenteSuplenteId: number; nombre: string } | null
}
// Sigue en uso por features/modulosDistribucion (ModalMigrarReemplazos,
// en los flujos de "editar módulos" y "nueva versión" -- eso no cambió).
// Ya NO se usa en el flujo de eliminar distribución (ver UX-DIS-011/151).
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
// UX-DIS-011/151: simplificado -- ya no existe requiereConfirmacion/
// tramos/avisoReemplazoNoAplica, eliminarDistribucion.ts ahora es
// directo (tira error 409 si no se puede, o borra sin más pasos).
export type EliminarDistribucionResult = {
  ok:                 boolean
  deleted?:           boolean
  clasesSuspendidas?: number
}