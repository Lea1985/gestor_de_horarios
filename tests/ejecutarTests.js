import { exec } from "child_process";
import path from "path";

// Función para ejecutar un script y esperar a que termine
function runScript(script) {
  return new Promise((resolve) => {
    console.log(`\n===============================`);
    console.log(`🔹 Ejecutando ${script}...`);
    console.log(`===============================\n`);

    const proceso = exec(`node ${script}`, { cwd: process.cwd() });

    proceso.stdout.on("data", (data) => process.stdout.write(data));
    proceso.stderr.on("data", (data) => process.stderr.write(data));

    proceso.on("close", (code) => {
      console.log(`\n🔹 ${script} finalizado con código ${code}`);
      resolve();
    });
  });
}

async function main() {
  const scripts = [
    path.join("tests", "preDesarrollo.js"),
    path.join("tests", "pruebaPrisma.js"),
    path.join("tests", "checkMigraciones.js"),
    path.join("tests", "checkEndpoints.js"),
    path.join("tests", "checkEntornoWSL.js"),
  ];

  for (const script of scripts) {
    await runScript(script);
  }

  console.log("\n🎯 Todos los tests finalizados ✅");
}

main();