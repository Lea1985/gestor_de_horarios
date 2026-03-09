console.log('🔹 Probando endpoints de Next.js...');

import { spawn } from 'child_process';
import kill from 'tree-kill';

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

      const response = await fetch(url, {
        headers: {
          "x-institucion-id": "1"
        }
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Endpoint ${url} responde correctamente:`, data);
      } else {
        console.error(`❌ Endpoint ${url} respondió error:`, data);
      }

    } catch (e) {
      console.error(`❌ Error en endpoint ${url}:`, e.message);
    }
  }

  try {
    await new Promise((resolve) => {
      kill(next.pid, 'SIGKILL', resolve);
    });

    console.log('🛑 Servidor Next.js detenido');
  } catch (e) {
    console.log('⚠️ Error al detener servidor:', e.message);
  }

  console.log('🎯 Test de endpoints finalizado');
}

testEndpoints();