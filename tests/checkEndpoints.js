console.log('🔹 Probando endpoints de Next.js...');

import { spawn } from 'child_process';

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testEndpoints() {
  const next = spawn('npm', ['run', 'dev'], {
    stdio: 'ignore',
    shell: true,
  });

  await esperar(4000);

  const endpoints = ['http://localhost:3000/api/instituciones'];

  for (const url of endpoints) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(`✅ Endpoint ${url} responde JSON correctamente:`, data);
    } catch (e) {
      console.error(`❌ Error en endpoint ${url}:`, e.message);
    }
  }

  try {
    process.kill(next.pid);
    console.log('🛑 Servidor Next.js detenido');
  } catch (e) {
    console.log('⚠️ El servidor ya estaba detenido');
  }

  console.log('🎯 Test de endpoints finalizado');
}

testEndpoints();
