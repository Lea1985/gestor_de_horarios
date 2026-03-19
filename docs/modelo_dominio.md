📘 Modelo de Dominio – Sistema de Gestión Horaria Estructural v3.1

Modelo alineado con:

Schema Prisma

Diagrama ER v3.1

Arquitectura SaaS multi-tenant

Versionado estructural

Trazabilidad histórica

⚙️ Campos comunes

Varias entidades del sistema comparten atributos de auditoría y control:

id — clave primaria autoincremental

estado — estado lógico de la entidad (cuando aplica)

activo — indicador de habilitación operativa

deletedAt — eliminación lógica (soft delete)

createdAt — fecha de creación

updatedAt — fecha de última modificación automática

Estos campos permiten:

auditoría

desactivación sin pérdida de historial

preservación de trazabilidad

🏢 0. Institucion (Tenant del sistema)

Representa el tenant principal del sistema.

Cada institución constituye un espacio aislado de datos dentro de la arquitectura multi-tenant.

Atributos

id

nombre

configuracion (JSON opcional)

domicilio (opcional)

telefono (opcional)

email (opcional)

cuit (opcional, único)

estado

activo

deletedAt

createdAt

updatedAt

Relaciones

1 Institucion → N UnidadesOrganizativas

1 Institucion → N ModulosHorario

1 Institucion → N Asignaciones

1 Institucion → N AgenteInstitucion

1 Institucion → N UsuarioRol

Todas las entidades operativas dependen de la institución para garantizar el aislamiento multi-tenant.

👤 Agente

Representa una persona física del sistema.

El agente no pertenece directamente a una institución.
La pertenencia institucional se gestiona mediante AgenteInstitucion.

Esto permite que una misma persona participe en múltiples instituciones.

Atributos

id

nombre

apellido

documento (opcional)

email

telefono

domicilio

estado

activo

deletedAt

createdAt

updatedAt

Relaciones

1 Agente → N Asignaciones

1 Agente → N AgenteInstitucion

Reglas

Puede existir sin asignaciones.

Puede pertenecer a múltiples instituciones.

No se elimina físicamente del sistema.

Puede tener múltiples asignaciones activas o históricas.

🔗 AgenteInstitucion

Representa la relación entre un agente y una institución.

Permite gestionar la pertenencia institucional de una persona.

Atributos

agenteId (FK)

institucionId (FK)

documento (identificador institucional opcional)

estado

createdAt

updatedAt

Restricciones

PK compuesta:

(agenteId, institucionId)

UNIQUE:

(institucionId, documento)
Reglas

Un agente puede pertenecer a múltiples instituciones.

Un documento es único dentro de una institución.

Permite registrar identificadores institucionales institucionales.

🏢 UnidadOrganizativa

Representa una unidad estructural dentro de una institución.

Ejemplos:

aula

departamento

laboratorio

área administrativa

Atributos

id

institucionId

codigoUnidad

nombre

tipo

estado

activo

deletedAt

createdAt

updatedAt

Restricciones
UNIQUE (institucionId, codigoUnidad)
Relaciones

1 UnidadOrganizativa → N Asignaciones

Reglas

Puede existir sin asignaciones.

No debe eliminarse físicamente si posee asignaciones asociadas.

🔗 Asignacion

Representa la relación estructural entre:

un agente

una unidad organizativa

una institución

Es la entidad central del modelo.

Atributos

id

institucionId

agenteId

unidadId

identificadorEstructural

fecha_inicio

fecha_fin

estado

activo

deletedAt

createdAt

updatedAt

Restricciones
UNIQUE (institucionId, identificadorEstructural)
UNIQUE (agenteId, unidadId, institucionId)
Relaciones

1 Asignacion → N DistribucionHoraria

1 Asignacion → N Incidencias

Reglas

Representa un cargo estructural dentro de la institución.

Un agente puede tener múltiples asignaciones.

Una unidad puede tener múltiples asignaciones, pero solo una activa si la regla institucional lo requiere.

No se elimina si posee historial.

Se inactiva en lugar de eliminarse.

🕒 ModuloHorario

Bloque horario estructural definido por una institución.

Atributos

id

institucionId

dia_semana

hora_desde

hora_hasta

activo

deletedAt

createdAt

updatedAt

Relaciones

1 ModuloHorario → N DistribucionModulo

Reglas

Define bloques reutilizables de tiempo.

Pertenece exclusivamente a una institución.

No puede superponerse con otro módulo dentro de la misma institución.

Puede ser utilizado por múltiples distribuciones horarias.

📅 DistribucionHoraria (Versionada)

Representa la configuración horaria de una asignación en un período determinado.

Atributos

id

asignacionId

version

fecha_vigencia_desde

fecha_vigencia_hasta

estado

activo

deletedAt

createdAt

updatedAt

Restricciones
UNIQUE (asignacionId, version)
Relaciones

1 DistribucionHoraria → N DistribucionModulo

Reglas

No se sobreescriben versiones.

Cada cambio genera una nueva versión.

Las versiones históricas deben preservarse.

La validación de coherencia horaria se realiza en este nivel.

Debe validarse coherencia de vigencias.

🔄 DistribucionModulo

Entidad intermedia que vincula una DistribucionHoraria con uno o más ModuloHorario.

Atributos

distribucionHorariaId

moduloHorarioId

createdAt

updatedAt

PK compuesta
(distribucionHorariaId, moduloHorarioId)
Reglas

No puede existir duplicado.

Define la composición horaria de una versión específica.

Permite trazabilidad estructural de los módulos asignados.

⚠️ Incidencia

Representa una alteración temporal sobre una asignación.

Ejemplos:

licencia

reemplazo

suspensión

modificación temporal

Atributos

id

asignacionId

fecha_desde

fecha_hasta

tipo (enum TipoIncidencia)

incidenciaPadreId

observacion

activo

deletedAt

createdAt

updatedAt

Relaciones

1 Incidencia → N Incidencias (hijas)

Relación recursiva mediante:

incidenciaPadreId
Reglas

Siempre pertenece a una asignación.

Las incidencias son inmutables.

Permiten encadenamiento jerárquico.

Pueden formar estructuras tipo árbol.

Debe validarse superposición incompatible.

Se preservan como historial estructural.

🔎 Flujo Estructural del Dominio

Flujo principal del modelo:

Institucion
   ↓
Agente
   ↓
Asignacion
   ↓
DistribucionHoraria (versionada)
   ↓
DistribucionModulo
   ↓
ModuloHorario

Flujo de incidencias:

Asignacion
   ↓
Incidencia
   ↓
Incidencia (estructura recursiva)
🧠 Principios Arquitectónicos

El modelo sigue los siguientes principios:

Arquitectura multi-tenant con aislamiento por institución

Separación entre identidad global (Agente) y pertenencia institucional

Versionado estructural obligatorio

Incidencias con trazabilidad jerárquica

Eliminación lógica mediante soft delete

Validaciones críticas en capa de aplicación

Núcleo sector-agnóstico

Preparado para SaaS escalable

Integridad histórica de las asignaciones

## Reglas de coherencia horaria

### Coherencia por persona

Un agente no puede tener dos módulos horarios superpuestos
entre todas sus asignaciones activas dentro de una institución.

La validación se realiza al crear o modificar una DistribucionHoraria.

### Coherencia por unidad organizativa

Una unidad organizativa no puede tener dos módulos
superpuestos en el mismo momento dentro de una institución.

### Coherencia de módulos

Los ModuloHorario definidos por una institución
no pueden superponerse entre sí.