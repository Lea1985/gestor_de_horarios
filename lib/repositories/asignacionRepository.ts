//lib/repositories/asignacionRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const asignacionInclude = {
  agente:   true,
  unidad:   true,
  materia:  true,
  curso:    true,
  comision: true,
  turno:    true,
}

export const asignacionRepository = {

  listar(tenantId: number) {
    return prisma.asignacion.findMany({
      where: { institucionId: tenantId, deletedAt: null },
      include: asignacionInclude,
      orderBy: { createdAt: "desc" },
    })
  },

  obtenerPorId(id: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      include: asignacionInclude,
    })
  },

  existeEnTenant(id: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })
  },

  verificarAgente(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: {
        id: agenteId,
        deletedAt: null,
        instituciones: { some: { institucionId: tenantId } },
      },
      select: { id: true },
    })
  },

  verificarUnidad(unidadId: number, tenantId: number) {
    return prisma.unidadOrganizativa.findFirst({
      where: { id: unidadId, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })
  },

  verificarMateria(materiaId: number, tenantId: number) {
    return prisma.materia.findFirst({
      where: { id: materiaId, institucionId: tenantId },
      select: { id: true },
    })
  },

  verificarCurso(cursoId: number, tenantId: number) {
    return prisma.curso.findFirst({
      where: { id: cursoId, institucionId: tenantId },
      select: { id: true },
    })
  },

  verificarComision(comisionId: number, tenantId: number) {
    return prisma.comision.findFirst({
      where: { id: comisionId, institucionId: tenantId },
      select: { id: true },
    })
  },

  verificarTurno(turnoId: number, tenantId: number) {
    return prisma.turno.findFirst({
      where: { id: turnoId, institucionId: tenantId },
      select: { id: true },
    })
  },

  crear(data: {
    tenantId:                number
    agenteId:                number
    unidadId:                number
    identificadorEstructural: string
    fecha_inicio:            Date
    fecha_fin:               Date | null
    materiaId:               number | null
    cursoId:                 number | null
    comisionId:              number | null
    turnoId:                 number | null
  }) {
    return prisma.asignacion.create({
      data: {
        institucionId:           data.tenantId,
        agenteId:                data.agenteId,
        unidadId:                data.unidadId,
        identificadorEstructural: data.identificadorEstructural,
        fecha_inicio:            data.fecha_inicio,
        fecha_fin:               data.fecha_fin,
        materiaId:               data.materiaId,
        cursoId:                 data.cursoId,
        comisionId:              data.comisionId,
        turnoId:                 data.turnoId,
      },
      include: asignacionInclude,
    })
  },

  actualizar(id: number, data: Prisma.AsignacionUpdateInput) {
    return prisma.asignacion.update({
      where: { id },
      data,
      include: asignacionInclude,
    })
  },

  eliminar(id: number) {
    return prisma.asignacion.findFirst({
      where: { id },
      select: { id: true, deletedAt: true },
    }).then(async (existente) => {
      if (!existente || existente.deletedAt) return { ok: true, deleted: false }
      await prisma.asignacion.update({
        where: { id },
        data: { deletedAt: new Date(), activo: false },
      })
      return { ok: true, deleted: true }
    })
  },
}