// lib/repositories/asignacionRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const includeBase = {
  agente: true,
  unidad: true,
  materia: true,
  curso: true,
  comision: true,
  turno: true,
}

export const asignacionRepository = {
  listar(tenantId: number) {
    return prisma.asignacion.findMany({
      where: { institucionId: tenantId, deletedAt: null },
      include: includeBase,
      orderBy: { createdAt: "desc" },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      include: {
        ...includeBase,
        distribuciones: true,
        incidencias: true,
        horariosAsignados: true,
        ClaseProgramada: true,
      },
    })
  },

  crear(data: {
    tenantId: number
    agenteId: number
    unidadId: number
    identificadorEstructural: string
    fecha_inicio: Date
    fecha_fin: Date | null
    materiaId?: number | null
    cursoId?: number | null
    comisionId?: number | null
    turnoId?: number | null
  }) {
    return prisma.asignacion.create({
      data: {
        institucionId: data.tenantId,
        agenteId: data.agenteId,
        unidadId: data.unidadId,
        identificadorEstructural: data.identificadorEstructural,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        materiaId: data.materiaId ?? null,
        cursoId: data.cursoId ?? null,
        comisionId: data.comisionId ?? null,
        turnoId: data.turnoId ?? null,
      },
      include: includeBase,
    })
  },

  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.AsignacionUpdateInput
  ) {
    const existente = await prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Asignación no encontrada")
    }

    return prisma.asignacion.update({
      where: { id: existente.id },
      data,
      include: includeBase,
    })
  },

  async softDelete(id: number, tenantId: number) {
    const existente = await prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!existente) {
      throw new Error("Asignación no encontrada")
    }

    return prisma.asignacion.update({
      where: { id: existente.id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    })
  },

  verificarAgente(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: {
        id: agenteId,
        deletedAt: null,
        instituciones: {
          some: { institucionId: tenantId },
        },
      },
      select: { id: true },
    })
  },

  verificarUnidad(unidadId: number, tenantId: number) {
    return prisma.unidadOrganizativa.findFirst({
      where: {
        id: unidadId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  verificarMateria(materiaId: number, tenantId: number) {
    return prisma.materia.findFirst({
      where: {
        id: materiaId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  verificarCurso(cursoId: number, tenantId: number) {
    return prisma.curso.findFirst({
      where: {
        id: cursoId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  verificarComision(comisionId: number, tenantId: number) {
    return prisma.comision.findFirst({
      where: {
        id: comisionId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  verificarTurno(turnoId: number, tenantId: number) {
    return prisma.turno.findFirst({
      where: {
        id: turnoId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },
}