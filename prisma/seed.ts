import { PrismaClient, Estado, Dias, TipoUnidad, TipoIncidencia } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {

  console.log("🌪 Limpiando la base de datos...")

  await prisma.$executeRawUnsafe(`
  TRUNCATE TABLE
  "Reemplazo",
  "ClaseProgramada",
  "HorarioAsignado",
  "DistribucionModulo",
  "DistribucionHoraria",
  "Incidencia",
  "Asignacion",
  "AgenteInstitucion",
  "Agente",
  "ModuloHorario",
  "UnidadOrganizativa",
  "UsuarioRol",
  "Sesion",
  "Usuario",
  "Rol",
  "Institucion"
  RESTART IDENTITY CASCADE;
  `)

  console.log("✅ Base limpia")

  console.log("🌱 Creando datos de prueba...")

  // =========================
  // INSTITUCIONES
  // =========================

  const institucionesData = [
    { nombre: "Institución Demo", domicilio: "Calle Falsa 123", telefono: "3410000000", email: "demo@institucion.edu" },
    { nombre: "Escuela de Prueba", domicilio: "Calle Verdadera 456", telefono: "3411111111", email: "prueba@institucion.edu" },
    { nombre: "Instituto Experimental", domicilio: "Av. Siempreviva 789", telefono: "3412222222", email: "exp@institucion.edu" }
  ]

  await prisma.institucion.createMany({ data: institucionesData })

  const institucionesFull = await prisma.institucion.findMany()

  // =========================
  // UNIDADES
  // =========================

  const unidadesData: any[] = []

  for (const inst of institucionesFull) {

    unidadesData.push({
      institucionId: inst.id,
      codigoUnidad: 1,
      nombre: "Dirección",
      tipo: TipoUnidad.ADMIN
    })

    unidadesData.push({
      institucionId: inst.id,
      codigoUnidad: 2,
      nombre: "Aula 1",
      tipo: TipoUnidad.AULA
    })

    unidadesData.push({
      institucionId: inst.id,
      codigoUnidad: 3,
      nombre: "Aula 2",
      tipo: TipoUnidad.AULA
    })
  }

  await prisma.unidadOrganizativa.createMany({ data: unidadesData })

  const unidadesFull = await prisma.unidadOrganizativa.findMany()

  // =========================
  // MODULOS HORARIOS
  // =========================

  const diasArray: Dias[] = [
    Dias.LUNES,
    Dias.MARTES,
    Dias.MIERCOLES
  ]

  const modulosData: any[] = []

  for (const inst of institucionesFull) {

    for (const dia of diasArray) {

      for (let i = 8; i <= 10; i++) {

        modulosData.push({
          institucionId: inst.id,
          dia_semana: dia,
          hora_desde: i,
          hora_hasta: i + 1
        })

      }

    }

  }

  await prisma.moduloHorario.createMany({ data: modulosData })

  const modulosFull = await prisma.moduloHorario.findMany()

  // =========================
  // AGENTES
  // =========================

  const agentesData: any[] = []

  for (let i = 1; i <= 6; i++) {

    agentesData.push({
      nombre: `Agente${i}`,
      apellido: `Apellido${i}`,
      documento: `${10000000 + i}`,
      email: `agente${i}@demo.com`
    })

  }

  await prisma.agente.createMany({ data: agentesData })

  const agentesFull = await prisma.agente.findMany()

  // =========================
  // AGENTE INSTITUCION
  // =========================

  const agenteInstData: any[] = []

  for (const inst of institucionesFull) {

    for (let i = 0; i < 3; i++) {

      const ag = agentesFull[i]

      agenteInstData.push({
        agenteId: ag.id,
        institucionId: inst.id,
        documento: ag.documento
      })

    }

  }

  await prisma.agenteInstitucion.createMany({ data: agenteInstData })

  // =========================
  // ASIGNACIONES
  // =========================

  const asignacionesData: any[] = []

  for (const agInst of agenteInstData) {

    const unidad = unidadesFull.find(
      u =>
        u.institucionId === agInst.institucionId &&
        u.tipo === TipoUnidad.AULA
    )

    if (!unidad) continue

    asignacionesData.push({
      institucionId: agInst.institucionId,
      agenteId: agInst.agenteId,
      unidadId: unidad.id,
      identificadorEstructural: `ASIG-${agInst.agenteId}-${unidad.id}`,
      fecha_inicio: new Date()
    })

  }

  await prisma.asignacion.createMany({ data: asignacionesData })

  const asignacionesFull = await prisma.asignacion.findMany()

  // =========================
  // DISTRIBUCIONES HORARIAS
  // =========================

  const distribucionesData: any[] = []

  for (const asign of asignacionesFull) {

    for (let v = 1; v <= 3; v++) {

      distribucionesData.push({
        institucionId: asign.institucionId,
        asignacionId: asign.id,
        version: v,
        fecha_vigencia_desde: new Date()
      })

    }

  }

  await prisma.distribucionHoraria.createMany({ data: distribucionesData })

  const distribucionesFull = await prisma.distribucionHoraria.findMany()

  // =========================
  // DISTRIBUCION MODULOS
  // =========================

  const distribModuloData: any[] = []

  for (const dist of distribucionesFull) {

    const modulos = modulosFull.filter(
      m => m.institucionId === dist.institucionId
    )

    for (const m of modulos) {

      distribModuloData.push({
        distribucionHorariaId: dist.id,
        moduloHorarioId: m.id
      })

    }

  }

  await prisma.distribucionModulo.createMany({
    data: distribModuloData
  })

  // =========================
  // HORARIOS ASIGNADOS
  // =========================

  const horariosData: any[] = []

  for (const dist of distribucionesFull) {

    const asign = asignacionesFull.find(
      a => a.id === dist.asignacionId
    )

    const modulos = distribModuloData.filter(
      dm => dm.distribucionHorariaId === dist.id
    )

    for (const m of modulos) {

      horariosData.push({
        institucionId: dist.institucionId,
        agenteId: asign?.agenteId!,
        asignacionId: dist.asignacionId,
        distribucionHorariaId: dist.id,
        moduloHorarioId: m.moduloHorarioId
      })

    }

  }

  await prisma.horarioAsignado.createMany({
    data: horariosData
  })

  const horariosFull = await prisma.horarioAsignado.findMany()

  // =========================
  // CLASES PROGRAMADAS
  // =========================

  const clasesData: any[] = []

  const hoy = new Date()

  for (const h of horariosFull) {

    const asign = asignacionesFull.find(
      a => a.id === h.asignacionId
    )

    clasesData.push({
      institucionId: h.institucionId,
      asignacionId: h.asignacionId,
      moduloId: h.moduloHorarioId,
      unidadId: asign?.unidadId!,
      fecha: hoy
    })

  }

  await prisma.claseProgramada.createMany({
    data: clasesData
  })

  const clasesFull = await prisma.claseProgramada.findMany()

  // =========================
  // REEMPLAZOS DEMO
  // =========================

  if (clasesFull.length > 1) {

    await prisma.reemplazo.create({
      data: {
        claseId: clasesFull[0].id,
        asignacionTitularId: asignacionesFull[0].id,
        asignacionSuplenteId: asignacionesFull[1].id,
        observacion: "Reemplazo demo"
      }
    })

  }

  // =========================
  // INCIDENCIAS
  // =========================

  for (const asign of asignacionesFull) {

    for (let i = 1; i <= 3; i++) {

      await prisma.incidencia.create({
        data: {
          asignacionId: asign.id,
          fecha_desde: new Date(),
          fecha_hasta: new Date(Date.now() + 1000 * 60 * 60 * i),
          tipo: i % 2 === 0 ? TipoIncidencia.OTRO : TipoIncidencia.LICENCIA,
          observacion: `Incidencia demo ${i}`
        }
      })

    }

  }

  // =========================
  // ROLES
  // =========================

  await prisma.rol.createMany({
    data: [
      { nombre: "Admin", descripcion: "Administrador del sistema" },
      { nombre: "Docente", descripcion: "Profesor" },
      { nombre: "Invitado", descripcion: "Acceso limitado" }
    ]
  })

  const rolesFull = await prisma.rol.findMany()

  // =========================
  // USUARIOS
  // =========================

  const passwordHash = await bcrypt.hash("123456", 10)

  const usuariosData = agentesFull.map(a => ({
    nombre: `${a.nombre} ${a.apellido}`,
    email: a.email!,
    passwordHash
  }))

  usuariosData.push({
    nombre: "Leandro Alegre",
    email: "leandro@demo.com",
    passwordHash
  })

  await prisma.usuario.createMany({
    data: usuariosData
  })

  const usuariosFull = await prisma.usuario.findMany()

  // =========================
  // USUARIO ROL
  // =========================

  const usuarioRolData: any[] = []

  for (const u of usuariosFull) {

    const rol =
      u.email === "leandro@demo.com"
        ? rolesFull.find(r => r.nombre === "Admin")!
        : rolesFull.find(r => r.nombre === "Docente")!

    const inst = institucionesFull[0]

    usuarioRolData.push({
      usuarioId: u.id,
      rolId: rol.id,
      institucionId: inst.id
    })

  }

  await prisma.usuarioRol.createMany({
    data: usuarioRolData
  })

  // =========================
  // SESIONES
  // =========================

  const now = new Date()

  const expires = new Date(
    now.getTime() + 1000 * 60 * 60 * 24
  )

  const sesionesData = usuariosFull.map(u => ({
    usuarioId: u.id,
    token: `demo-token-${u.id}`,
    createdAt: now,
    expiresAt: expires
  }))

  await prisma.sesion.createMany({
    data: sesionesData
  })

  console.log("🌱 Seed completo generado correctamente ✅")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })