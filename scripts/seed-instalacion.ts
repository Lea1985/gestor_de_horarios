/**
 * seed-instalacion.ts
 *
 * Seed real de una instalación nueva (una escuela, un tenant). A diferencia
 * de prisma/seed.ts (que crea 3 instituciones mezcladas para pruebas de
 * aislamiento multi-tenant en desarrollo), este script crea UNA sola
 * institución real, con sus datos reales, a partir de un archivo de
 * configuración editable.
 *
 * No toca prisma/seed.ts ni lo reemplaza — son cosas distintas:
 *   - prisma/seed.ts       → fixture de desarrollo, no se usa en instalaciones reales.
 *   - seed-instalacion.ts  → lo que corre el instalador en la máquina de cada escuela.
 *
 * Uso:
 *   1. Copiar config/institucion.example.json a config/institucion.json
 *   2. Completar los datos reales de la escuela en ese archivo
 *      (config/institucion.json NUNCA se commitea — tiene datos reales
 *      y una contraseña temporal, por eso está en .gitignore)
 *   3. node --loader ts-node/esm scripts/seed-instalacion.ts
 *
 * También se puede apuntar a otro archivo de config:
 *   node --loader ts-node/esm scripts/seed-instalacion.ts ./config/otra-escuela.json
 *
 * Los datos operativos (turnos, unidades, agentes, módulos, período
 * operativo, catálogo de codigario) se cargan después, desde la UI ya
 * logueado como el admin creado acá — mismo criterio que prisma/seed.ts.
 */

import { PrismaClient, Estado } from "@prisma/client"
import bcrypt from "bcryptjs"
import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

const prisma = new PrismaClient()

interface ConfigInstalacion {
  institucion: {
    nombre: string
    dominio: string
    cuit: string
    domicilio: string
    telefono: string
    email: string
    configuracion: {
      usaMaterias: boolean
      usaCursos: boolean
      modulosDuracionMinutos: number
    }
  }
  adminInicial: {
    nombre: string
    email: string
    passwordTemporal: string
  }
}

function resolverRutaConfig(): string {
  const argPath = process.argv[2]
  if (argPath) return path.resolve(argPath)

  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(scriptDir, "..", "config", "institucion.json")
}

function cargarConfig(rutaConfig: string): ConfigInstalacion {
  if (!existsSync(rutaConfig)) {
    console.error(`No se encontró el archivo de configuración: ${rutaConfig}`)
    console.error(`Copiá config/institucion.example.json a esa ruta y completá los datos reales.`)
    process.exit(1)
  }

  const config = JSON.parse(readFileSync(rutaConfig, "utf-8")) as ConfigInstalacion

  const faltantes: string[] = []
  if (!config.institucion?.nombre) faltantes.push("institucion.nombre")
  if (!config.institucion?.cuit) faltantes.push("institucion.cuit")
  if (!config.institucion?.email) faltantes.push("institucion.email")
  if (!config.adminInicial?.nombre) faltantes.push("adminInicial.nombre")
  if (!config.adminInicial?.email) faltantes.push("adminInicial.email")
  if (!config.adminInicial?.passwordTemporal) faltantes.push("adminInicial.passwordTemporal")
  if (config.adminInicial?.passwordTemporal && config.adminInicial.passwordTemporal.length < 8) {
    faltantes.push("adminInicial.passwordTemporal (debe tener al menos 8 caracteres)")
  }

  if (faltantes.length > 0) {
    console.error("Faltan datos obligatorios en el archivo de configuración:")
    faltantes.forEach(f => console.error(`  - ${f}`))
    process.exit(1)
  }

  return config
}

async function asegurarRolesBase() {
  const definiciones = [
    { nombre: "ADMIN", descripcion: "Administrador de institución" },
    { nombre: "DIRECTIVO", descripcion: "Director o vicedirector" },
    { nombre: "DOCENTE", descripcion: "Profesor / docente" },
    { nombre: "VIEWER", descripcion: "Solo lectura" },
  ]

  const roles: Record<string, { id: number }> = {}
  for (const def of definiciones) {
    let rol = await prisma.rol.findFirst({ where: { nombre: def.nombre } })
    if (!rol) {
      rol = await prisma.rol.create({ data: def })
    }
    roles[def.nombre] = rol
  }
  return roles
}

async function main() {
  const rutaConfig = resolverRutaConfig()
  console.log(`Leyendo configuración de: ${rutaConfig}`)
  const config = cargarConfig(rutaConfig)

  console.log("🌱 Iniciando seed de instalación...")

  const roles = await asegurarRolesBase()
  console.log("✅ Roles base confirmados")

  const institucion = await prisma.institucion.upsert({
    where: { cuit: config.institucion.cuit },
    update: {},
    create: {
      nombre: config.institucion.nombre,
      dominio: config.institucion.dominio,
      cuit: config.institucion.cuit,
      domicilio: config.institucion.domicilio,
      telefono: config.institucion.telefono,
      email: config.institucion.email,
      estado: Estado.ACTIVO,
      configuracion: config.institucion.configuracion,
    },
  })
  console.log(`✅ Institución creada/confirmada: ${institucion.nombre} (id ${institucion.id})`)

  const passwordHash = await bcrypt.hash(config.adminInicial.passwordTemporal, 10)
  const admin = await prisma.usuario.upsert({
    where: { email: config.adminInicial.email },
    update: {},
    create: {
      email: config.adminInicial.email,
      passwordHash,
      nombre: config.adminInicial.nombre,
      estado: Estado.ACTIVO,
      esSuperAdmin: false,
    },
  })
  console.log(`✅ Usuario admin creado/confirmado: ${admin.email}`)

  await prisma.usuarioRol.upsert({
    where: {
      usuarioId_rolId_institucionId: {
        usuarioId: admin.id,
        rolId: roles["ADMIN"].id,
        institucionId: institucion.id,
      },
    },
    update: {},
    create: {
      usuarioId: admin.id,
      rolId: roles["ADMIN"].id,
      institucionId: institucion.id,
    },
  })
  console.log("✅ Rol ADMIN asignado")

  console.log("\n🎉 Seed de instalación completado")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`Institución : ${institucion.nombre}`)
  console.log(`Admin       : ${admin.email} / (la contraseña temporal del archivo de config)`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("A partir de acá, cargá turnos, unidades, agentes, módulos, período")
  console.log("operativo y el catálogo de codigario desde la UI, ya logueado como admin.")
}

main()
  .catch(e => {
    console.error("❌ Error en seed de instalación:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
