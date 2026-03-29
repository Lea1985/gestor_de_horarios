// tests/seedBase.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 🧹 Buscar instituciones huérfanas de test
const testInsts = await prisma.institucion.findMany({
  where: {
    nombre: { startsWith: 'Test ' },
    id: { notIn: [1, 2, 3] }
  },
  select: { id: true }
});

const ids = testInsts.map(i => i.id);

if (ids.length > 0) {
  const distribuciones = await prisma.distribucionHoraria.findMany({
    where: { asignacion: { unidad: { institucionId: { in: ids } } } },
    select: { id: true }
  });
  const distribucionIds = distribuciones.map(d => d.id);

  const codigarios = await prisma.codigario.findMany({
    where: { institucionId: { in: ids } },
    select: { id: true }
  });
  const codigarioIds = codigarios.map(c => c.id);

  await prisma.distribucionModulo.deleteMany({ where: { distribucionHorariaId: { in: distribucionIds } } });
  await prisma.distribucionHoraria.deleteMany({ where: { id: { in: distribucionIds } } });
  await prisma.incidencia.deleteMany({ where: { asignacion: { unidad: { institucionId: { in: ids } } } } });
  await prisma.asignacion.deleteMany({ where: { unidad: { institucionId: { in: ids } } } });
  await prisma.unidadOrganizativa.deleteMany({ where: { institucionId: { in: ids } } });
  await prisma.agenteInstitucion.deleteMany({ where: { institucionId: { in: ids } } });
  await prisma.codigarioItem.deleteMany({ where: { codigarioId: { in: codigarioIds } } }); // 👈
  await prisma.codigario.deleteMany({ where: { institucionId: { in: ids } } });
  await prisma.moduloHorario.deleteMany({ where: { institucionId: { in: ids } } });
  await prisma.institucion.deleteMany({ where: { id: { in: ids } } });

  console.log(`🧹 ${ids.length} institución/es de test limpiadas`);
} else {
  console.log('🧹 No hay instituciones de test para limpiar');
}

// ✅ Garantizar instituciones base
const instituciones = [
  { id: 1, nombre: 'Institución Demo',       dominio: 'instituciondemo',       domicilio: 'Calle Falsa 123',     telefono: '3410000000', email: 'demo@institucion.edu' },
  { id: 2, nombre: 'Escuela de Prueba',      dominio: 'escueladeprueba',       domicilio: 'Calle Verdadera 456', telefono: '3411111111', email: 'prueba@institucion.edu' },
  { id: 3, nombre: 'Instituto Experimental', dominio: 'institutoexperimental',  domicilio: 'Av. Siempreviva 789', telefono: '3412222222', email: 'exp@institucion.edu' },
];

for (const inst of instituciones) {
  await prisma.institucion.upsert({
    where: { id: inst.id },
    update: {},
    create: { ...inst, estado: 'ACTIVO', activo: true }
  });
  console.log(`✅ Institución [${inst.id}] ${inst.nombre} garantizada`);
}

await prisma.$disconnect();