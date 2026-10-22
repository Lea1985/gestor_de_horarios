// tests/helpers/guardiaBaseTest.ts
//
// Salvaguarda para tests que usan Prisma directo (mismo proceso que vitest):
// aborta si DATABASE_URL no apunta exactamente a la base "gestor_test".
// Compara solo el nombre de la base y nunca imprime la URL (lleva la
// contraseña). Llamarla al principio del primer beforeAll del archivo, antes
// de cualquier consulta.

const BASE_DE_TEST = "gestor_test"

export function asegurarBaseDeTest(): void {
  const url = process.env.DATABASE_URL
  let nombre: string | null = null
  try {
    nombre = url ? decodeURIComponent(new URL(url).pathname.replace(/^\//, "")) : null
  } catch {
    nombre = null
  }
  if (nombre !== BASE_DE_TEST) {
    throw new Error(
      `Abortado: los tests con Prisma directo solo corren contra "${BASE_DE_TEST}" ` +
      `(base configurada: ${nombre === null ? "ninguna o ilegible" : `"${nombre}"`}).`
    )
  }
}
