console.log('🔹 Probando endpoints de Next.js...');

async function testEndpoints() {

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

  console.log('🎯 Test de endpoints finalizado');
}

testEndpoints();