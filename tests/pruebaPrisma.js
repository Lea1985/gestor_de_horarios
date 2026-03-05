import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔹 Probando Prisma...");

  // 1️⃣ Listar todas las instituciones existentes
  const instituciones = await prisma.institucion.findMany();
  console.log("Instituciones actuales:", instituciones);

  // 2️⃣ Verificar si ya existe la institución de prueba
  const nombrePrueba = "Escuela de Prueba";
  const existente = await prisma.institucion.findFirst({
    where: { nombre: nombrePrueba },
  });

  let nuevaInstitucion;

  if (!existente) {
    // 3️⃣ Crear la institución de prueba
    nuevaInstitucion = await prisma.institucion.create({
      data: {
        nombre: nombrePrueba,
        estado: "ACTIVO",
      },
    });
    console.log("✅ Nueva institución creada:", nuevaInstitucion);
  } else {
    console.log("⚠️ La institución de prueba ya existe:", existente);
    nuevaInstitucion = existente;
  }

  // 4️⃣ Borrar la institución de prueba al final
  const borrada = await prisma.institucion.deleteMany({
    where: { nombre: nombrePrueba },
  });
  console.log("🗑 Institución de prueba eliminada:", borrada.count, "registro(s) borrado(s)");
}

main()
  .catch((e) => console.error("❌ Error en la prueba de Prisma:", e.message))
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🎯 Test de Prisma finalizado");
  });