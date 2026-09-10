/**
 * resetear-password.ts
 *
 * Reseteo manual de contraseña — mecanismo de escape mientras no exista
 * recuperación self-service (instalación local, piloto de un tenant).
 * No pasa por la API (no existe ningún endpoint que actualice
 * passwordHash de un usuario ya creado): hashea la contraseña nueva con
 * el mismo criterio que usa el login (bcrypt) y cierra todas las
 * sesiones activas del usuario, para que cualquier sesión abierta con
 * la contraseña vieja quede inservible de inmediato.
 *
 * Ejecución:
 *   node --loader ts-node/esm scripts/resetear-password.ts <email> <nueva-password>
 *
 * o vía npm:
 *   npm run resetear-password -- <email> <nueva-password>
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const [, , email, nuevaPassword] = process.argv

  if (!email || !nuevaPassword) {
    console.error("Uso: node --loader ts-node/esm scripts/resetear-password.ts <email> <nueva-password>")
    process.exit(1)
  }

  if (nuevaPassword.length < 8) {
    console.error("La contraseña nueva debe tener al menos 8 caracteres.")
    process.exit(1)
  }

  const usuario = await prisma.usuario.findUnique({
    where:  { email },
    select: { id: true, nombre: true, email: true },
  })

  if (!usuario) {
    console.error(`No existe ningún usuario con email "${email}".`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(nuevaPassword, 10)

  await prisma.usuario.update({
    where: { id: usuario.id },
    data:  { passwordHash },
  })

  const { count } = await prisma.sesion.deleteMany({
    where: { usuarioId: usuario.id },
  })

  console.log(`Contraseña actualizada para ${usuario.nombre} (${usuario.email}).`)
  console.log(`Se cerraron ${count} sesión${count !== 1 ? "es" : ""} activa${count !== 1 ? "s" : ""} de ese usuario.`)
}

main()
  .catch(e => {
    console.error("Error reseteando la contraseña:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())