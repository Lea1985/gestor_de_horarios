import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPostgres() {
  console.log('🔹 Probando conexión a PostgreSQL...');
  try {
    // Esto hace una consulta simple
    const result = await prisma.$queryRaw`SELECT NOW() as now`;
    console.log('✅ PostgreSQL responde:', result);
  } catch (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  }
}

function testDocker() {
  console.log('🔹 Verificando contenedores Docker activos...');
  try {
    const containers = execSync('docker ps --format "table {{.Names}}\t{{.Status}}"', { encoding: 'utf8' });
    console.log(containers);
  } catch (err) {
    console.error('❌ Error verificando Docker:', err.message);
  }
}

async function main() {
  testDocker();
  await testPostgres();
  console.log('🎯 Test full stack finalizado');
  await prisma.$disconnect();
}

main();