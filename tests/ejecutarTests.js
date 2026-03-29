import { exec, spawn } from 'child_process';
import path from 'path';
import waitOn from 'wait-on';

let server;
let serverIniciadoPorNosotros = false;

async function isServerRunning() {
  try {
    const res = await fetch("http://localhost:3000");
    return res.ok;
  } catch {
    return false;
  }
}

async function iniciarServer() {
  const running = await isServerRunning();

  if (running) {
    console.log("🟡 Next ya está corriendo. No se levanta otro.");
    return;
  }

  console.log("\n🚀 Iniciando servidor Next.js...\n");

  server = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true
  });

  serverIniciadoPorNosotros = true;

  await waitOn({
    resources: ["http://localhost:3000"],
    timeout: 15000
  });

  console.log("✅ Servidor listo\n");
}

async function cerrarServer() {
  if (serverIniciadoPorNosotros && server) {
    console.log("\n🛑 Cerrando servidor Next.js...");
    server.kill();
  } else {
    console.log("\n🟡 Server no se cierra (ya estaba corriendo)");
  }
}

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
  // 🔹 tests sin server (no necesitan Next)
  const scripts = [
    path.join('tests', 'preDesarrollo.js'),
    path.join('tests', 'pruebaPrisma.js'),
    path.join('tests', 'checkMigraciones.js'),
    path.join('tests', 'seedBase.js'),   // 👈 garantiza institución id:1 antes de todo
  ];

  for (const script of scripts) {
    await runScript(script);
  }

  await iniciarServer();

  const apiTests = [
    path.join('tests', 'checkEndpoints.js'),
    path.join('tests', 'middlewareTest.js'),
    path.join('tests', 'apiAgentesTest.js'),
    path.join('tests', 'apiUnidadesTest.js'),
    path.join('tests', 'apiAsignacionesTest.js'),
    path.join('tests', 'apiDistribucionesTest.js'),
    path.join('tests', 'apiDistribucionModuloTest.js'),
    path.join('tests', 'apiModulosHorariosTest.js'),
    path.join('tests', 'apiIncidenciasTest.js'),
    path.join('tests', 'apiClasesTest.js'),
    path.join('tests', 'apiReemplazosTest.js'),
    path.join('tests', 'apiCodigariosTest.js')
  ];

  for (const script of apiTests) {
    await runScript(script);
  }

  await cerrarServer();

  console.log('\n🎯 Todos los tests finalizados ✅');
}

main();