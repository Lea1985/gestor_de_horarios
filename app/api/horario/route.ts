// app/api/horario/route.ts
// Devuelve la grilla semanal de clases de una asignación, unidad o comisión.
// Requiere: semana (cualquier fecha de la semana) + al menos un filtro.

import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"] as const
const DIA_INDEX = ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"]

function rangoDeSemana(semana: string): { lunes: Date; domingo: Date } {
  const fecha = new Date(semana)
  const dia   = fecha.getDay() === 0 ? 7 : fecha.getDay()
  const lunes = new Date(fecha)
  lunes.setDate(fecha.getDate() - dia + 1)
  lunes.setHours(0, 0, 0, 0)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  domingo.setHours(23, 59, 59, 999)
  return { lunes, domingo }
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)
    const asignacionId = searchParams.get("asignacionId")
    const unidadId     = searchParams.get("unidadId")
    const comisionId   = searchParams.get("comisionId") // nuevo filtro
    const semana       = searchParams.get("semana")

    if (!semana) {
      return Response.json({ error: "El parámetro semana es obligatorio" }, { status: 400 })
    }

    if (!asignacionId && !unidadId && !comisionId) {
      return Response.json(
        { error: "Se requiere al menos uno de: asignacionId, unidadId, comisionId" },
        { status: 400 }
      )
    }

    const { lunes, domingo } = rangoDeSemana(semana)

    const where: Prisma.ClaseProgramadaWhereInput = {
      institucionId: tenantId,
      fecha:         { gte: lunes, lte: domingo },
    }

    if (asignacionId) where.asignacionId = parseInt(asignacionId)
    if (unidadId)     where.unidadId     = parseInt(unidadId)
    if (comisionId)   where.comisionId   = parseInt(comisionId)

    const clases = await prisma.claseProgramada.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { modulo: { hora_desde: "asc" } }],
      include: {
        modulo:   true,
        unidad:   { select: { nombre: true, tipo: true } },
        comision: { select: { nombre: true, id: true } },
        asignacion: {
          select: {
            identificadorEstructural: true,
            agente: { select: { nombre: true, apellido: true } },
          },
        },
        reemplazos: {
          where: { activo: true },
          select: {
            id:          true,
            observacion: true,
            asignacionSuplente: {
              select: { agente: { select: { nombre: true, apellido: true } } },
            },
          },
        },
      },
    })

    // Agrupar por día
    const grilla = DIAS.reduce((acc, dia) => {
      acc[dia] = clases.filter(c => DIA_INDEX[new Date(c.fecha).getDay()] === dia)
      return acc
    }, {} as Record<string, typeof clases>)

    return Response.json({
      semana: { lunes: lunes.toISOString(), domingo: domingo.toISOString() },
      grilla,
    })
  })
}