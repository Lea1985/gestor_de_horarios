import { exec, spawn } from 'child_process';
import path from 'path';

let server;

// 🔥 levantar Next UNA vez
async function iniciarServer() {
  console.log("\n🚀 Iniciando servidor Next.js...\n");

  server = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true
  });

  // esperar a que levante
  await new Promise(res => setTimeout(res, 5000));

  console.log("✅ Servidor listo\n");
}

// 🔥 cerrar server al final
async function cerrarServer() {
  if (server) {
    console.log("\n🛑 Cerrando servidor Next.js...");
    server.kill();
  }
}

// tu función original
function runScript(script) {
  return new Promise((resolve) => {
    console.log(`\n===============================`);
    console.log(`🔹 Ejecutando ${script}...`);
    console.log(`===============================\n`);

    const proceso = exec(`node ${script}`, { cwd: process.cwd() });

    proceso.stdout.on('data', (data) => process.stdout.write(data));
    proceso.stderr.on('data', (data) => process.stderr.write(data));

    proceso.on('close', (code) => {
      console.log(`\n🔹 ${script} finalizado con código ${code}`);
      resolve();
    });
  });
}

async function main() {
  const scripts = [
    path.join('tests', 'preDesarrollo.js'),
    path.join('tests', 'pruebaPrisma.js'),
    path.join('tests', 'checkMigraciones.js'),

    // 🚀 levantar server acá
  ];

  // correr tests sin server
  for (const script of scripts) {
    await runScript(script);
  }

  // 🔥 levantar server UNA vez
  await iniciarServer();

  const apiTests = [
    path.join('tests', 'checkEndpoints.js'),
    path.join('tests', 'checkMiddleware.js'),
    path.join('tests', 'apiAgentesTest.js'),
    path.join('tests', 'apiUnidadesTest.js')
  ];

  for (const script of apiTests) {
    await runScript(script);
  }

  // 🔥 cerrar server
  await cerrarServer();

  console.log('\n🎯 Todos los tests finalizados ✅');
}

main();