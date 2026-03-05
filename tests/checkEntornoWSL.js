import { execSync } from "child_process";

console.log("🔹 Verificando entorno WSL...");

try {
  const nodeVersion = execSync("node -v", { encoding: "utf8" }).trim();
  const npmVersion = execSync("npm -v", { encoding: "utf8" }).trim();
  const dockerVersion = execSync("docker --version", { encoding: "utf8" }).trim();

  console.log("✅ Node.js version:", nodeVersion);
  console.log("✅ NPM version:", npmVersion);
  console.log("✅ Docker version:", dockerVersion);
} catch (e) {
  console.error("❌ Error verificando entorno WSL:", e.message);
}