🗂 Sprint Planning – Sprint 02
🎯 Objetivo del Sprint

Implementar el aislamiento multi-tenant real del sistema, garantizando que cada institución opere dentro de su propio contexto de datos.

Además, sentar las bases para configuración institucional extensible.

📦 Sprint Goal

"El sistema debe poder operar con múltiples instituciones manteniendo aislamiento lógico completo de datos."

🧩 Alcance del Sprint

Incluye:

Entidad Institucion operativa

Middleware de tenant

Contexto institucional en requests

Aislamiento de queries por institucionId

Configuración institucional básica

No incluye:

Autenticación multiusuario

Panel de administración

CRUD completos de entidades

Reglas de negocio complejas

🛠 Sprint Backlog – Sprint 02
🔵 1. Multi-Tenant Core
🟢 2.1 Modelo Institución

Estado actual: ya implementado en Prisma

Tareas restantes:

Revisar integridad del schema

Validar migración

Crear seed inicial de institución

Tareas:

Seed Institucion

Crear institución demo

Ejemplo:

Institucion:
- id: 1
- nombre: "Institución Demo"
🟢 2.2 Contexto Institucional

Crear mecanismo para identificar la institución activa del request.

Opciones posibles:

Header HTTP

Subdominio

Token

Query param (solo dev)

Para el MVP se recomienda:

x-institucion-id

Ejemplo request:

GET /api/personas
x-institucion-id: 1
🟢 2.3 Middleware Tenant

Crear middleware que:

1️⃣ Lea institucionId
2️⃣ Valide existencia
3️⃣ Lo agregue al contexto

Ubicación sugerida:

src/interfaces/http/middlewares/tenantMiddleware.ts

Responsabilidad:

request
   ↓
leer institucionId
   ↓
validar
   ↓
inyectar en contexto
🟢 2.4 Aislamiento de Queries

Garantizar que todas las queries filtren por institucionId.

Ejemplo:

Incorrecto:

prisma.persona.findMany()

Correcto:

prisma.persona.findMany({
  where: { institucionId }
})

Se recomienda crear helper:

getTenantPrismaClient()
🔵 2. Configuración por Institución
🟢 2.5 Configuración institucional

Ya lo anticipaste correctamente:

configuracion Json?

Ejemplo:

{
  "duracionModulo": 40,
  "extensiones": {
    "educacion": true
  }
}

Tareas:

definir estructura inicial

helper para lectura

🟢 2.6 Servicio de Configuración

Crear servicio:

src/application/institucion/getConfiguracionInstitucion.ts

Responsabilidad:

obtener configuración

aplicar defaults

🔵 3. Tests de Aislamiento

Muy importante para SaaS.

Tests a implementar:

Caso 1

Institución A no ve datos de B

Caso 2

Creación respeta tenant

Caso 3

Consulta sin tenant falla

📊 Definition of Done – Sprint 02

El sprint se considera terminado cuando:

✅ El sistema soporta múltiples instituciones
✅ Cada request opera dentro de un tenant
✅ Las queries filtran por institucionId
✅ Existe middleware de tenant
✅ Configuración institucional disponible
✅ Tests de aislamiento funcionando
✅ Documentación del sprint guardada en:

docs/sprints/sprint-02
⚠️ Riesgos Identificados

Olvidar filtrar por institucionId

Romper el aislamiento multi-tenant

Mezclar lógica de negocio con lógica de tenant

Sobrediseñar el sistema de configuración

⏱ Estimación

Duración sugerida:

1 semana

Complejidad:

Media

Riesgo técnico:

Medio (multi-tenant siempre tiene riesgo si se implementa mal).

🧠 Resultado Esperado

Al finalizar el sprint:

El sistema será verdaderamente multi-tenant.

Es decir:

Institucion A
   ├ Personas
   ├ Asignaciones
   └ Horarios

Institucion B
   ├ Personas
   ├ Asignaciones
   └ Horarios

Sin posibilidad de cruce.