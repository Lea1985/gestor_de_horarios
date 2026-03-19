import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import waitOn from "wait-on"; // npm i wait-on
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const baseUrl = "http://localhost:3000/api/agentes";
const tenantHeader = { "x-institucion-id": "1", "Content-Type": "application/json" };

const testAgents = [
  { nombre: "QA2", apellido: "Tester1", documento: "90000009", email: "qa9@escuela.edu" },
  { nombre: "QA2", apellido: "Tester2", documento: "90000008", email: "qa8@escuela.edu" },
  { nombre: "QA3", apellido: "Tester3", documento: "90000007", email: "qa7@escuela.edu" },
];

// Verifica si la app Next.js corre y la levanta si no
async function ensureAppRunning() {
  try {
    const res = await fetch("http://localhost:3000/api/instituciones");
    if (res.ok) {
      console.log("✅ App ya corriendo.");
      return null; // no necesitamos iniciar
    }
  } catch {}
  console.log("⚠️ App no corriendo. Levantando Next.js...");
  const server = spawn("npm", ["run", "dev"], { stdio: "inherit" });
  await waitOn({ resources: ["http://localhost:3000"], timeout: 10000 });
  console.log("✅ App lista para tests.");
  return server;
}

async function runAdvancedTests() {
  console.log("=== INICIANDO TEST SUITE AVANZADO DE AGENTES ===");
  const results = [];
  const serverProcess = await ensureAppRunning();

  for (const agent of testAgents) {
    const agentResult = { agente: agent.nombre, pasos: {} };

    try {
      // Crear agente
      console.log(`Creando agente: ${agent.nombre}`);
      const createRes = await fetch(baseUrl, {
        method: "POST",
        headers: tenantHeader,
        body: JSON.stringify(agent),
      });
      const created = await createRes.json();
      const agentId = created.agente.id;
      agentResult.pasos.crear = created.agente.nombre === agent.nombre ? "✅" : "❌";
      console.log("Respuesta POST:", created);

      // GET por ID
      console.log(`Consultando agente por ID: ${agentId}`);
      const getRes = await fetch(`${baseUrl}/${agentId}`, { headers: tenantHeader });
      const getById = await getRes.json();
      agentResult.pasos.getId = getById.agente.nombre === agent.nombre ? "✅" : "❌";
      console.log("Respuesta GET por ID:", getById);

      // PATCH (actualizar teléfono)
      const phone = "341555" + Math.floor(Math.random() * 9000 + 1000);
      console.log(`Actualizando teléfono a: ${phone}`);
      const patchRes = await fetch(`${baseUrl}/${agentId}`, {
        method: "PATCH",
        headers: tenantHeader,
        body: JSON.stringify({ telefono: phone }),
      });
      const patched = await patchRes.json();
      agentResult.pasos.patch = patched.telefono === phone ? "✅" : "❌";
      console.log("Respuesta PATCH:", patched);

      // GET post-PATCH
      const verifyRes = await fetch(`${baseUrl}/${agentId}`, { headers: tenantHeader });
      const verify = await verifyRes.json();
      agentResult.pasos.verificarPatch = verify.agente.telefono === phone ? "✅" : "❌";
      console.log("Verificación PATCH GET:", verify);

      // DELETE (soft delete)
      console.log(`Eliminando agente ID: ${agentId}`);
      const deleteRes = await fetch(`${baseUrl}/${agentId}`, {
        method: "DELETE",
        headers: tenantHeader,
      });
      const deleted = await deleteRes.json();
      agentResult.pasos.delete = !deleted.agenteEliminado.activo ? "✅" : "❌";
      console.log("Respuesta DELETE:", deleted);

      // GET all verifica que no esté
      const getAllRes = await fetch(baseUrl, { headers: tenantHeader });
      const allAgents = await getAllRes.json();
      const stillExists = allAgents.find(a => a.agenteId === agentId && a.agente.activo);
      agentResult.pasos.verificarEliminado = !stillExists ? "✅" : "❌";

    } catch (err) {
      agentResult.error = `${err}`;
      console.error(`❌ ERROR EN AGENTE: ${agent.nombre}`, err);
    }

    results.push(agentResult);
  }

  // Guardar resultados en archivo JSON
  fs.writeFileSync(path.join("tests", "test_results.json"), JSON.stringify(results, null, 2));
  console.log("Resultados guardados en tests/test_results.json");

  // Limpieza: borrar registros de prueba con Prisma
  await prisma.agente.deleteMany({
    where: {
      documento: { in: testAgents.map(a => a.documento) }
    }
  });
  console.log("✅ Registros de prueba eliminados con Prisma.");

  // Cerrar servidor si lo levantamos nosotros
  if (serverProcess) {
    serverProcess.kill();
    console.log("✅ Servidor Next.js detenido.");
  }

  console.log("=== TEST SUITE COMPLETADO ===");
}

runAdvancedTests().catch(err => console.error("❌ ERROR GENERAL TEST SUITE:", err));