# 📘 Modelo de Dominio – Sistema de Gestión Horaria Estructural v3.1

Modelo alineado con:

- Reglas de negocio estructurales
- ER v3.1
- Product Backlog
- Principios SaaS multi-tenant
- Trazabilidad e inmutabilidad

---

## ⚙️ Campos comunes
La mayoría de las entidades del sistema comparten varios atributos de auditoría o control:

- `id` (PK autonumérica)
- `institucion_id` en entidades operativas para aislamiento multi-tenant
- `estado` (cuando la entidad puede activarse/inactivarse)
- `created_at` (marca de creación)
- `updated_at` (marca de última modificación, con comportamiento automático)

Estos campos se documentan explícitamente en cada modelo debajo.

---

# 🏢 0. Institucion (Multi-Tenant)

Representa el tenant del sistema.

Cada institución es un espacio completamente aislado de datos.

## Atributos

- id (PK)
- nombre
- configuracion (JSON opcional)
- domicilio (opcional)
- telefono (opcional)
- email (opcional)
- cuit (opcional)
- estado (Activa / Inactiva)
- created_at
- updated_at

## Relaciones

- 1 Institucion → N Personas
- 1 Institucion → N UnidadesOrganizativas
- 1 Institucion → N ModulosHorario
- 1 Institucion → N Asignaciones

🔐 Todas las entidades operativas incluyen `institucion_id`.  
No existe cruce de datos entre instituciones.

---

# 👤 Persona

Representa cualquier recurso humano asignable dentro de una institución.

⚠️ La persona es contextual al tenant.  
Si alguien trabaja en dos instituciones distintas, existirá una Persona en cada una.

## Atributos

- id (PK)
- institucion_id (FK)
- nombre
- apellido
- documento
- email
- telefono
- domicilio
- estado (Activo / Inactivo)
- created_at
- updated_at

## Restricciones

- UNIQUE (institucion_id, documento)

## Relaciones

- 1 Persona → N Asignaciones

## Reglas

- Puede existir sin asignaciones.
- No puede eliminarse si tiene asignaciones o incidencias asociadas.
- No puede tener superposición horaria efectiva entre distribuciones activas.
- La validación horaria ocurre a nivel de DistribucionHoraria.

---

# 🏢 UnidadOrganizativa

Representa una unidad operativa interna.

Ejemplos:

- Área
- Servicio
- Proyecto
- Departamento

## Atributos

- id (PK)
- institucion_id (FK)
- nombre
- tipo (opcional)
- estado (Activa / Inactiva)
- created_at
- updated_at

## Relaciones

- 1 UnidadOrganizativa → N Asignaciones

## Reglas

- Puede existir sin asignaciones.
- No puede eliminarse si posee asignaciones históricas o activas.

---

# 🔗 Asignacion

Relación estructural entre Persona y UnidadOrganizativa.

Es la entidad central del modelo.

## Atributos

- id (PK)
- institucion_id (FK)
- persona_id (FK)
- unidad_id (FK)
- estado (Activa / Inactiva)
- identificador_estructural (opcional)
- fecha_inicio
- fecha_fin (nullable)
- created_at
- updated_at

## Restricciones

- UNIQUE (institucion_id, identificador_estructural) cuando no es null

## Reglas

- No se elimina si tiene historial.
- Se inactiva en lugar de eliminarse.
- Puede coexistir con otras asignaciones de la misma persona.
- La coherencia horaria se valida a nivel distribución.
- Toda DistribucionHoraria e Incidencia depende de una Asignacion existente.

## Relaciones

- 1 Asignacion → N DistribucionesHorarias
- 1 Asignacion → N Incidencias

---

# 🕒 ModuloHorario

Bloque horario estructural configurable por institución.

## Atributos

- id (PK)
- institucion_id (FK)
- dia_semana (1–7)
- hora_desde
- hora_hasta
- created_at
- updated_at

## Restricciones

- No pueden superponerse dentro de la misma institución.
- hora_hasta > hora_desde.

## Reglas

- Son reutilizables por múltiples distribuciones.
- No dependen de normativa sectorial.

---

# 📅 DistribucionHoraria (Versionada)

Representa una configuración horaria versionada de una asignación.

## Atributos

- id (PK)
- asignacion_id (FK)
- version (incremental por asignación)
- fecha_vigencia_desde
- fecha_vigencia_hasta (nullable)
- estado
- created_at
- updated_at

## Reglas

- No se sobreescriben versiones.
- Toda modificación genera una nueva versión.
- Solo puede existir una versión vigente por período.
- Debe validarse coherencia de vigencias.
- Participa en la validación de superposición horaria por persona.
- Las versiones históricas no se modifican.

## Relaciones

- 1 DistribucionHoraria → N DistribucionModulo

---

# 🔄 DistribucionModulo

Relación estructural entre DistribucionHoraria y ModuloHorario.

Materializa la composición horaria de una versión específica.

## Atributos

- distribucion_horaria_id (FK)
- modulo_horario_id (FK)
- created_at
- updated_at

## PK compuesta

(distribucion_horaria_id, modulo_horario_id)

## Reglas

- No puede existir duplicado.
- Cada versión puede tener su propio conjunto de módulos.
- No se modifica una vez cerrada la versión.

---

# ⚠️ Incidencia

Representa una alteración temporal sobre una asignación.

Siempre afecta un rango completo de fechas.

## Atributos

- id (PK)
- asignacion_id (FK)
- fecha_desde
- fecha_hasta
- tipo (configurable por institución)
- incidencia_padre_id (nullable FK recursivo)
- observacion
- created_at
- updated_at

## Reglas

- Es inmutable.
- fecha_hasta ≥ fecha_desde.
- Permite encadenamiento jerárquico N niveles.
- Una incidencia puede tener múltiples hijas.
- Las incidencias hijas no pueden superponerse entre sí.
- No se elimina.
- No altera el historial estructural previo.
- Debe validarse superposición incompatible.

---

# 🔎 Relaciones Clave (Flujo Estructural)

Persona  
↓  
Asignacion  
↓  
DistribucionHoraria (versionada)  
↓  
DistribucionModulo  
↓  
ModuloHorario  

Asignacion  
↓  
Incidencia  
↓  
Incidencia (árbol recursivo)

Todo bajo Institucion (multi-tenant real con aislamiento).

---

# 🧠 Principios Arquitectónicos del Modelo v3.1

- Núcleo sector-agnóstico.
- Multi-tenant real con aislamiento por institución.
- Persona contextual al tenant.
- Versionado estructural obligatorio.
- Incidencias inmutables.
- Eliminación lógica en lugar de eliminación física.
- Validaciones críticas en capa de aplicación.
- Trazabilidad completa por diseño.
- Preparado para SaaS escalable.
- Sin dependencia normativa en el núcleo.