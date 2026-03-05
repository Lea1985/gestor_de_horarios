import { execSync } from 'child_process';

console.log('🔹 Verificando migraciones de Prisma...');

try {
  // Ejecuta el comando de migraciones
  const resultado = execSync('npx prisma migrate status', { encoding: 'utf8' });
  console.log('✅ Estado de migraciones:\n', resultado);
} catch (e) {
  console.error('❌ Error al verificar migraciones:', e.message);
}
