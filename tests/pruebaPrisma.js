import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔹 Probando Prisma...');

  // 1️⃣ Listar todas las instituciones existentes
  const instituciones = await prisma.institucion.findMany();
  console.log('Instituciones actuales:', instituciones);

  // 2️⃣ Verificar si ya existe la institución de prueba
  const nombrePrueba = 'Escuela de Prueba';
  const existente = await prisma.institucion.findFirst({
    where: { nombre: nombrePrueba },
  });

  let nuevaInstitucion;

  if (!existente) {
    nuevaInstitucion = await prisma.institucion.create({
      data: { nombre: nombrePrueba, estado: 'ACTIVO' },
    });
    console.log('✅ Nueva institución creada:', nuevaInstitucion);
  } else {
    console.log('⚠️ La institución de prueba ya existe:', existente);
    nuevaInstitucion = existente;
  }

  const institucionId = nuevaInstitucion.id;

  // 3️⃣ Cleanup en orden correcto por FK
  // distribucionModulo → distribucionHoraria → asignacion → unidad → agente → institucion

  const distribuciones = await prisma.distribucionHoraria.findMany({
    where: { asignacion: { unidad: { institucionId } } },
    select: { id: true },
  });
  const distribucionIds = distribuciones.map(d => d.id);

  await prisma.distribucionModulo.deleteMany({
    where: { distribucionHorariaId: { in: distribucionIds } },
  });

  await prisma.distribucionHoraria.deleteMany({
    where: { id: { in: distribucionIds } },
  });

  await prisma.asignacion.deleteMany({
    where: { unidad: { institucionId } },
  });

  await prisma.unidadOrganizativa.deleteMany({
    where: { institucionId },
  });

  await prisma.agenteInstitucion.deleteMany({
    where: { institucionId },
  });

  await prisma.institucion.deleteMany({
    where: { nombre: nombrePrueba },
  });

  console.log('🗑 Institución de prueba y dependencias eliminadas');
}

main()
  .catch((e) => console.error('❌ Error en la prueba de Prisma:', e.message))
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🎯 Test de Prisma finalizado');
  });