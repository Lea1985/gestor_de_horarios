import prisma from "@/lib/prisma"

export async function crearEscenarioBasico(tenantId: number) {

  const unidad = await prisma.unidadOrganizativa.create({
    data: {
      institucionId: tenantId,
      codigoUnidad: Math.floor(Math.random() * 10000), // evita conflictos
      nombre: "Unidad Test",
      tipo: "AULA",
    },
  })

  const agente = await prisma.agente.create({
    data: {
      nombre: "Juan",
      apellido: "Perez",
      documento: Math.random().toString(), // evita unique issues
    },
  })

  await prisma.agenteInstitucion.create({
    data: {
      agenteId: agente.id,
      institucionId: tenantId,
      documento: agente.documento,
    },
  })

  // 🔧 NECESARIO: módulo para clases
const modulo = await prisma.moduloHorario.upsert({
  where: {
    institucionId_dia_semana_hora_desde_hora_hasta: {
      institucionId: tenantId,
      dia_semana: "LUNES",
      hora_desde: 480,
      hora_hasta: 540,
    },
  },
  update: {},
  create: {
    institucionId: tenantId,
    dia_semana: "LUNES",
    hora_desde: 480,
    hora_hasta: 540,
  },
})

  const asignacion = await prisma.asignacion.create({
    data: {
      agenteId: agente.id,
      institucionId: tenantId,
      unidadId: unidad.id,
      identificadorEstructural: "MAT-" + Math.random(), // evita unique
      activo: true,
      fecha_inicio: new Date(), // ✅ FIX CLAVE
    },
  })

  // 3 clases con distintos estados
  const fechas = [
    new Date("2024-01-01"),
    new Date("2024-01-02"),
    new Date("2024-01-03"),
  ]

  await prisma.claseProgramada.createMany({
    data: [
      {
        asignacionId: asignacion.id,
        institucionId: tenantId,
        unidadId: unidad.id,
        moduloId: modulo.id, // ✅ FIX CLAVE
        fecha: fechas[0],
        estado: "PROGRAMADA",
      },
      {
        asignacionId: asignacion.id,
        institucionId: tenantId,
        unidadId: unidad.id,
        moduloId: modulo.id,
        fecha: fechas[1],
        estado: "DICTADA",
      },
      {
        asignacionId: asignacion.id,
        institucionId: tenantId,
        unidadId: unidad.id,
        moduloId: modulo.id,
        fecha: fechas[2],
        estado: "SUSPENDIDA",
      },
    ],
  })

  return { unidad, agente, asignacion, modulo, fechas }
}