import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed...")

  // === INSTITUCIÓN ===
  const institucion = await prisma.institucion.create({
    data: {
      nombre: "Institución Demo",
      domicilio: "Calle Falsa 123",
      telefono: "3410000000",
      email: "demo@institucion.edu"
    }
  })
  console.log("✔ Institución creada:", institucion.id)

  // === UNIDADES ===
  const unidad1 = await prisma.unidadOrganizativa.create({
    data: { institucionId: institucion.id, codigoUnidad: 1, nombre: "Dirección", tipo: "ADMIN" }
  })
  const unidad2 = await prisma.unidadOrganizativa.create({
    data: { institucionId: institucion.id, codigoUnidad: 2, nombre: "Aula 1", tipo: "AULA" }
  })
  console.log("✔ Unidades creadas")

  // === MÓDULOS HORARIOS ===
  await prisma.moduloHorario.createMany({
    data: [
      { institucionId: institucion.id, dia_semana: 1, hora_desde: "08:00:00", hora_hasta: "08:40:00" },
      { institucionId: institucion.id, dia_semana: 1, hora_desde: "08:40:00", hora_hasta: "09:20:00" },
      { institucionId: institucion.id, dia_semana: 1, hora_desde: "09:20:00", hora_hasta: "10:00:00" }
    ]
  })
  console.log("✔ Módulos horarios creados")

  // === AGENTE ===
  const agente = await prisma.agente.create({
    data: { nombre: "Juan", apellido: "Pérez", documento: "12345678", email: "juan@demo.com" }
  })
  console.log("✔ Agente creado")

  await prisma.agenteInstitucion.create({
    data: { agenteId: agente.id, institucionId: institucion.id, documento: "12345678" }
  })
  console.log("✔ Relación agente-institución creada")

  await prisma.asignacion.create({
    data: { institucionId: institucion.id, agenteId: agente.id, unidadId: unidad1.id, identificadorEstructural: "DIR-001", fecha_inicio: new Date() }
  })
  console.log("✔ Asignación creada")

  // === ROLES ===
  const rolAdmin = await prisma.rol.create({ data: { nombre: "Admin", descripcion: "Administrador del sistema" } })
  const rolDocente = await prisma.rol.create({ data: { nombre: "Docente", descripcion: "Profesor" } })
  console.log("✔ Roles creados")

  // === USUARIOS ===
  const passwordHash = await bcrypt.hash("123456", 10)

  const usuario1 = await prisma.usuario.create({
    data: { nombre: "Leandro Alegre", email: "leandro@demo.com", passwordHash }
  })
  const usuario2 = await prisma.usuario.create({
    data: { nombre: "Juan Pérez", email: "juan@demo.com", passwordHash }
  })
  console.log("✔ Usuarios creados")

  // === ASIGNAR ROLES A USUARIOS ===
  await prisma.usuarioRol.create({
    data: { usuarioId: usuario1.id, rolId: rolAdmin.id, institucionId: institucion.id }
  })
  await prisma.usuarioRol.create({
    data: { usuarioId: usuario2.id, rolId: rolDocente.id, institucionId: institucion.id }
  })
  console.log("✔ Roles asignados a usuarios")

  // === SESIONES INICIALES ===
  const now = new Date()
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24) // 24 hs

  await prisma.sesion.createMany({
    data: [
      { usuarioId: usuario1.id, token: "demo-token-leandro", createdAt: now, expiresAt: expires },
      { usuarioId: usuario2.id, token: "demo-token-juan", createdAt: now, expiresAt: expires }
    ]
  })
  console.log("✔ Sesiones creadas")

  console.log("🌱 Seed completo y funcional")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })