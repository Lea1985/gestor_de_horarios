// app/api/horario/route.ts
import { withTenant } from "@/lib/tenant/withTenant"
import prisma from "@/lib/prisma"

// Calcular lunes y domingo de la semana que contiene la fecha dada
function rangoDeSemana(semana: string): { lunes: Date; domingo: Date } {
  const fecha = new Date(semana)
  const dia = fecha.getDay() === 0 ? 7 : fecha.getDay()
  const lunes = new Date(fecha)
  lunes.setDate(fecha.getDate() - dia + 1)
  lunes.setHours(0, 0, 0, 0)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  domingo.setHours(23, 59, 59, 999)
  return { lunes, domingo }
}

export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const { searchParams } = new URL(req.url)
    const asignacionId = searchParams.get("asignacionId")
    const unidadId     = searchParams.get("unidadId")
    const semana       = searchParams.get("semana") // fecha cualquiera de la semana

    if (!semana) {
      return Response.json({ error: "El parámetro semana es obligatorio" }, { status: 400 })
    }

    if (!asignacionId && !unidadId) {
      return Response.json(
        { error: "Se requiere asignacionId o unidadId" },
        { status: 400 }
      )
    }

    const { lunes, domingo } = rangoDeSemana(semana)

    const where: any = {
      institucionId: tenantId,
      fecha: { gte: lunes, lte: domingo }
    }

    if (asignacionId) where.asignacionId = parseInt(asignacionId)
    if (unidadId)     where.unidadId     = parseInt(unidadId)

    const clases = await prisma.claseProgramada.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { modulo: { hora_desde: "asc" } }],
      include: {
        modulo: true,
        unidad: { select: { nombre: true, tipo: true } },
        asignacion: {
          select: {
            identificadorEstructural: true,
            agente: { select: { nombre: true, apellido: true } }
          }
        },
        reemplazos: {
          where: { activo: true },
          select: {
            id: true,
            observacion: true,
            asignacionSuplente: {
              select: { agente: { select: { nombre: true, apellido: true } } }
            }
          }
        }
      }
    })

    // Agrupar por día
    const dias = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"]
    const grilla = dias.reduce((acc, dia) => {
      acc[dia] = clases.filter(c => {
        const d = new Date(c.fecha).getDay()
        const nombre = ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"][d]
        return nombre === dia
      })
      return acc
    }, {} as Record<string, typeof clases>)

    return Response.json({
      semana: { lunes: lunes.toISOString(), domingo: domingo.toISOString() },
      grilla
    })

  }, req)
}