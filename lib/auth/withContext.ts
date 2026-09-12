// lib/auth/withContext.ts
// Wrapper único que reemplaza withAuth + withTenant.
// Lee los headers inyectados por el proxy — sin queries a DB.
// El proxy ya validó el token, el tenant y el estado de licencia antes de
// que el request llegue aquí (ver proxy.ts) -- acá no se repite ese check
// para no duplicar la query ni tener dos lugares que mantener sincronizados.
//
// Además, dispara dos tareas de mantenimiento una vez por día por
// institución -- es el único "reloj" que tiene el sistema: sin
// infraestructura de cron, la primera request de cada día para cada
// institución es lo que las hace correr. El updateMany atómico evita que
// dos requests simultáneas al arrancar el día las disparen dos veces
// (gana la primera, las demás ven count=0 y siguen).
//
//   1. cerrarPeriodoSiVencido: si el período ACTIVO ya pasó su fecha_hasta,
//      se cierra solo -- si no, queda ACTIVO indefinidamente hasta que
//      alguien lo cierre a mano, bloqueando la activación del próximo (#81,
//      24/08/2026). Corre ANTES que resolverClasesVencidas: el motor
//      necesita ver el período ya cerrado para decidir bien entre DICTADA
//      y SUSPENDIDA/PERIODO_OPERATIVO en las clases residuales (mismo
//      criterio que ya usa cerrarPeriodo.ts).
//   2. resolverClasesVencidas: hace que las clases PROGRAMADA vencidas
//      pasen a DICTADA.
//
// Si cualquiera de las dos falla, se revierte el claim (ultimaResolucionClases
// vuelve a null) para que la próxima request de HOY reintente, en vez de
// quedar marcado como "hecho" hasta mañana pese al fallo (UX-CLS-003).
//
// Uso en un handler:
//
//   export async function GET(req: Request) {
//     return withContext(req, async ({ usuarioId, tenantId }) => {
//       // lógica
//     })
//   }
import prisma from "@/lib/prisma"
import { RequestContext } from "@/lib/types/context"
import { resolverClasesVencidas } from "@/lib/usecases/clases/resolverClasesVencidas"
import { cerrarPeriodo } from "@/lib/usecases/periodosOperativos/cerrarPeriodo"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

async function cerrarPeriodoSiVencido(tenantId: number): Promise<boolean> {
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const activo = await periodoOperativoRepository.obtenerVigente(tenantId)
  if (!activo || activo.fecha_hasta >= hoy) return true // no hay activo, o todavía no venció -- no es un fallo
  try {
    await cerrarPeriodo(tenantId, activo.id)
    return true
  } catch (error) {
    console.error(`Error auto-cerrando período vencido (institucion ${tenantId}, periodo ${activo.id}):`, error)
    return false
  }
}

async function resolverClasesVencidasSiCorresponde(tenantId: number) {
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const { count } = await prisma.institucion.updateMany({
    where: {
      id: tenantId,
      OR: [
        { ultimaResolucionClases: null },
        { ultimaResolucionClases: { lt: hoy } },
      ],
    },
    data: { ultimaResolucionClases: hoy },
  })
  if (count === 0) return // otra request ya se encargó hoy para esta institución

  const periodoOk = await cerrarPeriodoSiVencido(tenantId)

  let clasesOk = true
  try {
    await resolverClasesVencidas(tenantId)
  } catch (error) {
    clasesOk = false
    console.error(`Error en resolverClasesVencidas (institucion ${tenantId}):`, error)
    // no relanzamos -- que un fallo acá no tumbe el request real
  }

  if (!periodoOk || !clasesOk) {
    // Liberar el claim para que la próxima request de HOY reintente,
    // en vez de quedar "marcado como hecho" hasta mañana pese al fallo.
    await prisma.institucion.updateMany({
      where: { id: tenantId, ultimaResolucionClases: hoy },
      data: { ultimaResolucionClases: null },
    }).catch((rollbackError) => {
      console.error(`Error revirtiendo ultimaResolucionClases (institucion ${tenantId}):`, rollbackError)
    })
  }
}

export async function withContext(
  req: Request,
  handler: (ctx: RequestContext) => Promise<Response>
): Promise<Response> {
  try {
    const usuarioIdRaw = req.headers.get("x-user-id")
    const tenantIdRaw  = req.headers.get("x-tenant-id")
    if (!usuarioIdRaw || !tenantIdRaw) {
      return Response.json(
        { error: "Contexto de request incompleto" },
        { status: 401 }
      )
    }
    const usuarioId = Number(usuarioIdRaw)
    const tenantId  = Number(tenantIdRaw)
    if (Number.isNaN(usuarioId) || Number.isNaN(tenantId)) {
      return Response.json(
        { error: "Contexto de request inválido" },
        { status: 401 }
      )
    }

    await resolverClasesVencidasSiCorresponde(tenantId)
    return await handler({ usuarioId, tenantId })
  } catch (error) {
    console.error("Error en withContext:", error)
    return Response.json(
      { error: "Error interno" },
      { status: 500 }
    )
  }
}
