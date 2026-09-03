//lib/usecases/distribuciones/listarDistribuciones.ts
import { distribucionRepository, solapa } from "@/lib/repositories/distribucionRepository"
import prisma from "@/lib/prisma"
export async function listarDistribuciones(tenantId: number) {
  // UX-DIS-011/151: antes de listar, cerramos automáticamente por fecha
  // las que ya vencieron -- mismo patrón "por tráfico, sin cron" que ya
  // usa resolverClasesVencidas (#15). No hay job en background.
  await distribucionRepository.cerrarVencidas(tenantId)
  const distribuciones = await distribucionRepository.listar(tenantId)
  // Traemos todas las incidencias de la institución de una sola vez (evita
  // N+1 por distribución) para calcular, por cada una, si tiene alguna
  // incidencia (activa o eliminada, no importa) con fechas solapadas a su
  // propio tramo de vigencia -- esa es la condición que bloquea "Eliminar"
  // (ver eliminarDistribucion.ts para el detalle de la regla).
  const incidencias = await prisma.incidencia.findMany({
    where: { asignacion: { institucionId: tenantId } },
    select: { asignacionId: true, fecha_desde: true, fecha_hasta: true },
  })
  return distribuciones.map(d => {
    const dDesde = new Date(d.fecha_vigencia_desde)
    const dHasta = d.fecha_vigencia_hasta ? new Date(d.fecha_vigencia_hasta) : new Date("9999-12-31")
    const tieneIncidencias = incidencias.some(inc =>
      inc.asignacionId === d.asignacionId &&
      solapa(dDesde, dHasta, new Date(inc.fecha_desde), new Date(inc.fecha_hasta))
    )
    const puedeEliminar = d.estado === "ACTIVO" && !tieneIncidencias
    const motivoBloqueoEliminar =
      d.estado !== "ACTIVO"
        ? "Esta versión ya no está activa."
        : tieneIncidencias
        ? "Tiene incidencias asociadas — forma parte del historial."
        : null
    return { ...d, puedeEliminar, motivoBloqueoEliminar }
  })
}