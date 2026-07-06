/**
 * seed.ts
 *
 * Solo carga la estructura base para poder iniciar sesión:
 *   - Roles globales
 *   - Usuarios (superadmin + admins por institución)
 *   - Instituciones
 *   - Roles de usuario por institución
 *
 * Los datos operativos (turnos, unidades, agentes, módulos, etc.)
 * se cargan desde la UI una vez iniciada la sesión.
 *
 * Ejecución:
 *   npx prisma db seed
 */

import { PrismaClient, Estado } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed...")

  // -----------------------------------------------------------------------
  // ROLES GLOBALES
  // -----------------------------------------------------------------------
  const rolAdmin = await prisma.rol.upsert({
    where: { id: 1 },
    update: {},
    create: { nombre: "ADMIN", descripcion: "Administrador de institución" },
  })

  await prisma.rol.upsert({
    where: { id: 2 },
    update: {},
    create: { nombre: "DIRECTIVO", descripcion: "Director o vicedirector" },
  })

  await prisma.rol.upsert({
    where: { id: 3 },
    update: {},
    create: { nombre: "DOCENTE", descripcion: "Profesor / docente" },
  })

  await prisma.rol.upsert({
    where: { id: 4 },
    update: {},
    create: { nombre: "VIEWER", descripcion: "Solo lectura" },
  })

  console.log("✅ Roles creados")

  // -----------------------------------------------------------------------
  // USUARIOS
  // -----------------------------------------------------------------------
  const hash = await bcrypt.hash("password123", 10)

  const usuarioSuperAdmin = await prisma.usuario.upsert({
    where: { email: "superadmin@plataforma.com" },
    update: {},
    create: {
      email:        "superadmin@plataforma.com",
      passwordHash: hash,
      nombre:       "Super Admin",
      estado:       Estado.ACTIVO,
      esSuperAdmin: true,
    },
  })

  const usuarioAdminEscuela = await prisma.usuario.upsert({
    where: { email: "admin@escuela12.edu.ar" },
    update: {},
    create: {
      email:        "admin@escuela12.edu.ar",
      passwordHash: hash,
      nombre:       "Admin Escuela",
      estado:       Estado.ACTIVO,
      esSuperAdmin: false,
    },
  })

  const usuarioAdminSanatorio = await prisma.usuario.upsert({
    where: { email: "admin@sanatoriosur.com.ar" },
    update: {},
    create: {
      email:        "admin@sanatoriosur.com.ar",
      passwordHash: hash,
      nombre:       "Admin Sanatorio",
      estado:       Estado.ACTIVO,
      esSuperAdmin: false,
    },
  })

  console.log("✅ Usuarios creados")
  console.log("   superadmin@plataforma.com   / password123")
  console.log("   admin@escuela12.edu.ar      / password123")
  console.log("   admin@sanatoriosur.com.ar   / password123")

  // -----------------------------------------------------------------------
  // INSTITUCIONES
  // -----------------------------------------------------------------------
  const escuela = await prisma.institucion.upsert({
    where: { cuit: "30-12345678-9" },
    update: {},
    create: {
      nombre:    "Escuela Primaria N°12",
      dominio:   "escuela12.edu.ar",
      cuit:      "30-12345678-9",
      domicilio: "Av. San Martín 450, Rosario",
      telefono:  "0341-4100100",
      email:     "info@escuela12.edu.ar",
      estado:    Estado.ACTIVO,
      configuracion: {
        usaMaterias:            true,
        usaCursos:              true,
        modulosDuracionMinutos: 40,
      },
    },
  })

  const sanatorio = await prisma.institucion.upsert({
    where: { cuit: "30-98765432-1" },
    update: {},
    create: {
      nombre:    "Sanatorio del Sur",
      dominio:   "sanatoriosur.com.ar",
      cuit:      "30-98765432-1",
      domicilio: "Córdoba 1200, Rosario",
      telefono:  "0341-4200200",
      email:     "info@sanatoriosur.com.ar",
      estado:    Estado.ACTIVO,
      configuracion: {
        usaMaterias:            false,
        usaCursos:              false,
        modulosDuracionMinutos: 60,
      },
    },
  })

  console.log("✅ Instituciones creadas")

  // -----------------------------------------------------------------------
  // ROLES DE USUARIO POR INSTITUCIÓN
  // -----------------------------------------------------------------------

  // superadmin tiene acceso a ambas instituciones
  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: escuela.id } },
    update: {},
    create: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: escuela.id },
  })

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: sanatorio.id } },
    update: {},
    create: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: sanatorio.id },
  })

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioAdminEscuela.id, rolId: rolAdmin.id, institucionId: escuela.id } },
    update: {},
    create: { usuarioId: usuarioAdminEscuela.id, rolId: rolAdmin.id, institucionId: escuela.id },
  })

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioAdminSanatorio.id, rolId: rolAdmin.id, institucionId: sanatorio.id } },
    update: {},
    create: { usuarioId: usuarioAdminSanatorio.id, rolId: rolAdmin.id, institucionId: sanatorio.id },
  })

  console.log("✅ Roles de usuario asignados")

  // -----------------------------------------------------------------------
  // RESUMEN
  // -----------------------------------------------------------------------
  console.log("\n🎉 Seed completado")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Roles        : ADMIN, DIRECTIVO, DOCENTE, VIEWER")
  console.log("Usuarios     : 3 (superadmin + 2 admins)")
  console.log("Instituciones: Escuela N°12 + Sanatorio del Sur")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("A partir de acá, cargá los datos desde la UI.")
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })