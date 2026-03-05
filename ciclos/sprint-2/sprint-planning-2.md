🛠 Sprint Backlog – Sprint 02
🔵 1. Multi-Tenant Foundation
🟢 1.1 Modelado de Tenant (Institución)

Crear modelo Institucion en Prisma.

Campos iniciales:

id

nombre

codigo

createdAt

updatedAt

Relaciones:

Una institución tendrá:

Cursos

Comisiones

Cargos

Personas

Configuraciones

Objetivo:

Establecer la raíz del tenant del sistema.

🟢 1.2 Adaptación de Modelos Existentes

Agregar institucionId en las entidades principales:

Persona

Curso

Comisión

Cargo

MóduloHorario

CargoModuloHorario

Ausencia

Cada registro debe pertenecer obligatoriamente a una institución.

Cambios requeridos:

relaciones Prisma

migración nueva

actualización de seeds

🔵 2. Aislamiento de Datos
🟢 2.1 Estrategia de Aislamiento

Implementar logical tenant isolation.

Regla:

Todas las queries del sistema deben filtrar por:

institucionId

Ejemplo:

where: {
  institucionId: tenantId
}

Objetivo:

Evitar acceso a datos de otras instituciones.

🟢 2.2 Middleware de Tenant

Crear middleware que determine el tenant.

Estrategias posibles:

Header HTTP

Subdominio

Configuración de sesión

Para esta etapa inicial:

Header HTTP

x-tenant-id

El middleware debe:

leer el header

validar existencia

inyectar el tenantId en el request context

🔵 3. Configuración por Institución
🟢 3.1 Modelo ConfiguracionInstitucion

Crear entidad:

ConfiguracionInstitucion

Campos iniciales:

institucionId

duracionModulo

extensionesActivadas

createdAt

updatedAt

Objetivo:

Permitir personalizar comportamiento del sistema por institución.

🟢 3.2 Parámetros Iniciales

Configurar soporte para:

Duración del módulo

Ejemplo:

40 minutos
45 minutos
60 minutos
Extensiones del sistema

Estructura preparada para:

suplencias

gestión de reemplazos

reportes

🔵 4. Seeds Multi-Tenant

Actualizar seeds para:

Crear institución inicial:

Institución Demo

Configurar:

configuración institucional

módulos horarios base

🔵 5. Validaciones Técnicas

Validar:

ninguna entidad puede existir sin institucionId

constraints correctos

relaciones Prisma correctas

migración ejecutada correctamente

📊 Definition of Done (DoD)

El sprint se considera terminado cuando:

Modelo Institucion creado

Todas las entidades tienen institucionId

Migración Prisma aplicada correctamente

Middleware de tenant funcionando

Header x-tenant-id procesado correctamente

Seeds iniciales multi-tenant creados

Sistema corre con npm run dev

Tests de entorno pasan con npm run check

Documentación guardada en

/docs/sprints/sprint-02
⚠️ Riesgos Identificados
Error en migraciones

Modificar tablas existentes puede romper datos.

Mitigación:

revisar migración antes de aplicar.

Olvidar filtros de tenant

Puede provocar data leaks entre instituciones.

Mitigación:

centralizar lógica de acceso a datos.

Sobrediseño prematuro

Multi-tenant puede volverse complejo.

Mitigación:

comenzar con aislamiento lógico simple.

⏱ Estimación

Duración sugerida:

1 semana

Complejidad:

Media-Alta

Porque implica cambio estructural del modelo de datos.

🧠 Resultado Esperado

Al finalizar este sprint:

El sistema pasará de:

Single-tenant

a

Multi-tenant

Esto permitirá que múltiples instituciones usen el mismo sistema con aislamiento total de datos.

🗂 Sprint Planning – Sprint 02
🎯 Objetivo del Sprint

Transformar el sistema de una arquitectura single-tenant a una arquitectura multi-tenant mediante la introducción del concepto de institución como unidad de aislamiento de datos.

📦 Sprint Goal

"Convertir el sistema en una plataforma multi-institución con aislamiento lógico de datos."

🧩 Alcance del Sprint

Incluye:

Modelo Institucion

Adaptación de entidades existentes

Middleware de tenant

Configuración institucional

Seeds multi-tenant

No incluye:

autenticación

control de permisos

gestión de usuarios

lógica de negocio avanzada

UI multi-institución

🔄 Dependencias

Depende de:

Sprint 01 completado:

Prisma

PostgreSQL

migraciones

API base

📌 Entregables del Sprint

1️⃣ Schema Prisma multi-tenant
2️⃣ Migración aplicada
3️⃣ Middleware de tenant funcional
4️⃣ Seeds institucionales
5️⃣ Configuración institucional base