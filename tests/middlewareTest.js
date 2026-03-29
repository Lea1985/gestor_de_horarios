// tests/checkMiddleware.js
const baseUrl = "http://localhost:3000";

let result = { pasos: {} };

// ================================
// 🔹 HELPER
// ================================
async function check(label, url, options, validar) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    const ok = await validar(res, data);
    result.pasos[label] = ok ? "✅" : "❌";
    if (!ok) console.error(`❌ ${label}`, res.status, data);
  } catch (err) {
    result.pasos[label] = "❌";
    console.error(`❌ ${label} → ERROR:`, err.message);
  }
}

console.log("\n===============================");
console.log("🔹 Probando middleware multi-tenant...");
console.log("===============================\n");

// ================================
// 1️⃣ Header x-institucion-id → debe pasar
// ================================
await check(
  "header_x-institucion-id",
  `${baseUrl}/api/instituciones`,
  { headers: { "x-institucion-id": "1" } },
  (res) => res.ok
);

// ================================
// 2️⃣ Header x-tenant-id → debe pasar
// ================================
await check(
  "header_x-tenant-id",
  `${baseUrl}/api/instituciones`,
  { headers: { "x-tenant-id": "1" } },
  (res) => res.ok
);

// ================================
// 3️⃣ Sin tenant → debe bloquear con 400
// ================================
await check(
  "sin_tenant_bloqueado",
  `${baseUrl}/api/instituciones`,
  {},
  (res, data) => res.status === 400 && data?.error === "Tenant no definido"
);

// ================================
// 4️⃣ POST /api/instituciones sin tenant → bypass, debe pasar
// ================================
await check(
  "bypass_post_instituciones",
  `${baseUrl}/api/instituciones`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: "Test Bypass " + Date.now(),
      estado: "ACTIVO"
    })
  },
  (res) => res.status === 200 || res.status === 201
);

// ================================
// 5️⃣ GET /api/instituciones sin tenant → NO hace bypass, debe bloquear
// ================================
await check(
  "get_instituciones_sin_tenant",
  `${baseUrl}/api/instituciones`,
  { method: "GET" },
  (res, data) => res.status === 400 && data?.error === "Tenant no definido"
);

// ================================
// 6️⃣ Endpoint cualquiera sin tenant → debe bloquear
// ================================
await check(
  "otro_endpoint_sin_tenant",
  `${baseUrl}/api/agentes`,
  { method: "GET" },
  (res, data) => res.status === 400 && data?.error === "Tenant no definido"
);

// ================================
// 7️⃣ Header normalizado → tenant-id llega al handler
// ================================
await check(
  "header_normalizado",
  `${baseUrl}/api/instituciones`,
  { headers: { "x-institucion-id": "1" } },
  (res, data) => res.ok && Array.isArray(data)
);

console.log("\n📊 RESULTADOS\n");

console.table(result.pasos);
console.log("\n🎯 Test de middleware finalizado\n");