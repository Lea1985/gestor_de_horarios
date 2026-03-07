// tests/checkMiddleware.js
import { spawn } from 'child_process';
import kill from 'tree-kill';

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Espera hasta que el servidor responda o se agote el timeout
async function esperarServer(url, timeout = 15000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);

      if (res.ok || res.status === 400) {
        return;
      }

    } catch {}

    await esperar(500);
  }

  throw new Error(`Server no respondió en ${timeout}ms`);
}

// Función auxiliar para manejar fetch y errores
async function safeFetch(url, options = {}) {

  try {

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    let data = null;

    try {
      data = await res.json();
    } catch {}

    return {
      status: res.status,
      data
    };

  } catch (err) {

    return {
      error: err.message || String(err)
    };

  }
}

async function testMiddleware() {

  console.log('\n===============================');
  console.log('🔹 Probando middleware multi-tenant...');
  console.log('===============================\n');

  const PORT = 3000;
  const url = `http://localhost:${PORT}/api/instituciones`;

  const next = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: PORT.toString() },
  });

  // Esperar que el servidor responda
  try {
    await esperarServer(url);
  } catch (e) {
    console.error('❌ Servidor no respondió:', e.message);
    kill(next.pid, 'SIGTERM');
    return;
  }

  // ---------------------------------------------------
  // 1️⃣ Tenant desde header
  // ---------------------------------------------------

  const headerResult = await safeFetch(url, {
    headers: { 'x-institucion-id': '1234' }
  });

  if (headerResult.status === 200) {

    console.log('✅ Middleware pasa tenant desde header correctamente');

  } else {

    console.error('❌ Error al pasar tenant desde header:', headerResult);

  }

  // ---------------------------------------------------
  // 2️⃣ Tenant desde subdominio (simulado)
  // ---------------------------------------------------

  const subdomainResult = await safeFetch(url, {
    headers: {
      'host': 'localhost:3000',
      'x-forwarded-host': 'demo.midominio.com'
    }
  });

  if (subdomainResult.status === 200) {

    console.log('✅ Middleware pasa tenant desde subdominio correctamente');

  } else {

    console.error('❌ Error al pasar tenant desde subdominio:', subdomainResult);

  }

  // ---------------------------------------------------
  // 3️⃣ Sin tenant → debería devolver error 400
  // ---------------------------------------------------

  const noTenantResult = await safeFetch(url, {
    headers: { host: 'localhost:3000' }
  });

  if (
    noTenantResult.status === 400 ||
    (noTenantResult.data && noTenantResult.data.error === "Tenant no definido")
  ) {

    console.log('✅ Middleware devuelve error cuando no hay tenant');

  } else {

    console.error('❌ Error al validar ausencia de tenant:', noTenantResult);

  }

  // ---------------------------------------------------
  // Detener Next.js
  // ---------------------------------------------------

  try {

    kill(next.pid, 'SIGTERM', (err) => {

      if (err) {
        console.log('⚠️ Error al detener servidor:', err);
      } else {
        console.log('🛑 Servidor Next.js detenido');
      }

    });

  } catch {

    console.log('⚠️ El servidor ya estaba detenido');

  }

  console.log('\n🎯 Test de middleware finalizado\n');
}

testMiddleware();