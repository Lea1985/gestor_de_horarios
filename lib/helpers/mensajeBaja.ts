// lib/helpers/mensajeBaja.ts
//
// Texto para el usuario cuando una baja (asignación o distribución) no se
// aplicó porque cambiaría clases ya dictadas: el backend responde 409 con el
// aviso de la reconciliación. Función pura, sin imports de servidor: se usa
// en el navegador.

const MAX_FECHAS = 5

const ddmmaaaa = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/")

function enumerar(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

type RespuestaBaja = {
  error?:                string
  requiereConfirmacion?: boolean
  aviso?:                { dictadasAReescribir?: { fecha: string }[] }
}

/** Mensaje de error de una baja: el aviso explicado si lo hay; si no, el error del backend o el genérico. */
export function mensajeErrorBaja(data: RespuestaBaja | null | undefined, porDefecto: string): string {
  if (!data?.requiereConfirmacion) return data?.error ?? porDefecto
  const fechas = [...new Set((data.aviso?.dictadasAReescribir ?? []).map(c => c.fecha.slice(0, 10)))].sort()
  const cantidad = data.aviso?.dictadasAReescribir?.length ?? 0
  if (cantidad === 0) return "No se aplicó la baja: cambiaría clases que ya pasaron."
  const visibles = fechas.slice(0, MAX_FECHAS).map(ddmmaaaa)
  const resto = fechas.length - visibles.length
  const lista = resto > 0 ? `${visibles.join(", ")} y ${resto} más` : enumerar(visibles)
  const clases = cantidad === 1 ? "1 clase ya dictada" : `${cantidad} clases ya dictadas`
  return `No se aplicó la baja: cambiaría ${clases} (${lista}).`
}
