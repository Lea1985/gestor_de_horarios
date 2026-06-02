// lib/reporting/datasets/obtenerClasesOperativas.ts
import prisma from "@/lib/prisma"

import {
  CoberturaEstado,
} from "../transformers/calcularCobertura"

export type ClaseOperativa = {

  id: number

  fecha: Date

  estado: string

  coberturaEstado: CoberturaEstado

  incidencia: {
    id: number
  } | null
}

export async function obtenerClasesOperativas(
  tenantId: number,

  desde: Date,

  hasta: Date
): Promise<ClaseOperativa[]> {

  const clases =
    await prisma.claseProgramada.findMany({

      where: {

        institucionId: tenantId,

        fecha: {
          gte: desde,
          lte: hasta,
        },
      },

      include: {

        incidencia: {
          select: {
            id: true,
          },
        },

        reemplazos: {
          where: {
            activo: true,
          },

          select: {
            id: true,
          },
        },
      },
    })

  return clases.map(clase => {

    let coberturaEstado: CoberturaEstado =
      "NORMAL"

    if (clase.estado === "SUSPENDIDA") {

      coberturaEstado =
        "SUSPENDIDA"

    } else if (
      clase.reemplazos.length > 0
    ) {

      coberturaEstado =
        "REEMPLAZADA"

    } else if (
      clase.incidencia
    ) {

      coberturaEstado =
        "SIN_COBERTURA"
    }

    return {

      id: clase.id,

      fecha: clase.fecha,

      estado: clase.estado,

      coberturaEstado,

      incidencia: clase.incidencia,
    }
  })
}