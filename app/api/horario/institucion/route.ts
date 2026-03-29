// app/api/horario/institucion/route.ts
import { withTenant } from "@/lib/tenant/withTenant"
import prisma from "@/lib/prisma"

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
    const semana = searchParams.get("semana")

    if (!semana) {
      return Response.json({ error: "El parámetro semana es obligatorio" }, { status: 400 })
    }

    const { lunes, domingo } = rangoDeSemana(semana)

    const clases = await prisma.claseProgramada.findMany({
      where: {
        institucionId: tenantId,
        fecha: { gte: lunes, lte: domingo }
      },
      orderBy: [{ fecha: "asc" }, { modulo: { hora_desde: "asc" } }],
      include: {
        modulo:    true,
        unidad:    { select: { nombre: true, tipo: true } },
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
            asignacionSuplente: {
              select: { agente: { select: { nombre: true, apellido: true } } }
            }
          }
        }
      }
    })

    // Agrupar por unidad → día → clases
    const dias = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"]

    const porUnidad: Record<string, any> = {}

    for (const clase of clases) {
      const key = String(clase.unidadId)
      if (!porUnidad[key]) {
        porUnidad[key] = {
          unidad: clase.unidad,
          grilla: dias.reduce((acc, d) => { acc[d] = []; return acc }, {} as Record<string, any[]>)
        }
      }
      const d = new Date(clase.fecha).getDay()
      const nombre = ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"][d]
      porUnidad[key].grilla[nombre].push(clase)
    }

    return Response.json({
      semana:   { lunes: lunes.toISOString(), domingo: domingo.toISOString() },
      total:    clases.length,
      unidades: Object.values(porUnidad)
    })

  }, req)
}
