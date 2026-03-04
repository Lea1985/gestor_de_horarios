# Sistema de Gestión Horaria Estructural – Arquitectura v3.1

---

## 1. Propósito

Definir el núcleo estructural del sistema SaaS de gestión horaria,
orientado a organizaciones que asignan personas a unidades operativas con bloques horarios.

El sistema:

- Es transversal a distintos sectores.
- No depende de normativa específica.
- Garantiza trazabilidad histórica.
- Permite extensiones configurables desacopladas.
- Es multi-tenant desde el diseño.
- Prioriza coherencia estructural antes que complejidad normativa.

---

## 2. Principios del Modelo

1. El núcleo es independiente de régimen laboral específico.
2. No se sobreescriben datos históricos.
3. Las estructuras críticas se versionan.
4. Las incidencias pueden encadenarse en múltiples niveles (estructura en árbol).
5. No puede existir superposición horaria efectiva por persona.
6. El sistema es multi-tenant por diseño.
7. Las extensiones no contaminan el núcleo estructural.
8. La eliminación destructiva está prohibida.
9. La trazabilidad es un requisito estructural, no opcional.

---

## 3. Arquitectura General

### Capas

- **domain** → Entidades y reglas puras (sin dependencias externas)
- **application** → Casos de uso y validaciones estructurales
- **infrastructure** → Prisma, PostgreSQL, repositorios
- **interfaces** → API (Next.js / Route Handlers)

Regla clave:

- Separación estricta entre dominio y persistencia.
- Las reglas horarias viven en application/domain, no en infraestructura.
- La base de datos refuerza, pero no reemplaza, la lógica estructural.

---

## 4. Multi-Tenant

### Institucion

Representa el tenant del sistema.

Campos:

- id
- nombre
- configuracion (JSON opcional)
- fecha_creacion
- estado

Reglas estructurales:

- Toda entidad del núcleo referencia `institucion_id`.
- No existe cruce de datos entre instituciones.
- Las validaciones de unicidad se aplican por institución.
- La seguridad siempre está ligada al tenant.

---

## 5. Entidades del Núcleo

---

### Persona

Representa cualquier recurso humano asignable.

Campos:

- id
- institucion_id
- nombre
- apellido
- documento (único por institución)
- email
- estado (Activo/Inactivo)

Reglas:

- No puede eliminarse si tiene asignaciones.
- No puede tener superposición horaria efectiva.
- Puede existir sin asignaciones.
- La desactivación es lógica, no física.

---

### UnidadOrganizativa

Representa una unidad operativa dentro de la institución.

Campos:

- id
- institucion_id
- nombre
- tipo (opcional)
- estado

Reglas:

- Puede existir sin asignaciones activas.
- No puede eliminarse si tiene asignaciones asociadas.
- Es independiente de normativa sectorial.

---

### Asignacion

Representa la relación estructural entre Persona y UnidadOrganizativa.

Campos:

- id
- institucion_id
- persona_id
- unidad_id
- estado (Activa/Inactiva)
- identificador_estructural (opcional, único por institución)
- fecha_inicio
- fecha_fin (nullable)

Reglas:

- Es la entidad estructural central del sistema.
- No se elimina si posee historial.
- Puede coexistir con otras asignaciones de la misma persona, sujeto a validación horaria.
- Toda distribución horaria e incidencia depende de una asignación.
- La inactivación preserva historial.

---

### DistribucionHoraria

Representa una configuración horaria versionada de una Asignacion.

Campos:

- id
- asignacion_id
- fecha_vigencia_desde
- fecha_vigencia_hasta (nullable)
- version (incremental)
- estado

Reglas:

- No se sobreescriben versiones anteriores.
- Cada modificación genera una nueva versión.
- El versionado es incremental y obligatorio.
- Solo puede existir una versión vigente por período.
- No puede generar superposición horaria efectiva para la persona.

---

### ModuloHorario

Bloque de tiempo configurable por institución.

Campos:

- id
- institucion_id
- dia_semana
- hora_desde
- hora_hasta

Reglas:

- No pueden superponerse dentro de la misma institución.
- Son reutilizables por múltiples distribuciones.
- La duración es configurable por institución.
- Son parte de la infraestructura horaria base.

---

### DistribucionModulo

Tabla intermedia entre DistribucionHoraria y ModuloHorario.

Campos:

- distribucion_horaria_id
- modulo_horario_id

Reglas:

- No puede existir duplicado.
- Permite que cada versión tenga su propio conjunto de módulos.
- Es parte del versionado estructural.
- No se modifica retroactivamente.

---

### Incidencia

Representa una alteración temporal sobre una asignación.

Campos:

- id
- asignacion_id
- fecha_desde
- fecha_hasta
- tipo (configurable por institución)
- reemplaza_incidencia_id (nullable)
- observacion
- fecha_creacion

Reglas:

- Es inmutable una vez creada.
- Se registra por rango completo.
- Puede referenciar otra incidencia previa.
- Permite encadenamiento en múltiples niveles.
- Una incidencia puede tener múltiples incidencias hijas.
- Las incidencias hijas no pueden superponerse entre sí.
- No se eliminan incidencias históricas.
- La cadena completa puede reconstruirse mediante consulta recursiva (CTE).

---

## 6. Extensión Opcional – Régimen Laboral

No forma parte del núcleo estructural.

Puede incluir:

- Tipos normativos de incidencia
- Identificadores externos oficiales
- Reglas sectoriales
- Validaciones específicas

Se implementa como módulo desacoplado que utiliza el núcleo sin modificarlo.

---

## 7. Historial y Versionado

- Las asignaciones se inactivan, no se eliminan.
- Las distribuciones horarias se versionan de forma incremental.
- Las incidencias son inmutables.
- Toda modificación estructural relevante debe ser auditable.
- El sistema conserva trazabilidad completa por diseño.

---

## 8. Reglas Horarias

- No puede existir superposición horaria efectiva por persona.
- La validación se realiza en la capa de aplicación.
- La base de datos puede usar constraints adicionales como apoyo.
- Puede existir más de una distribución histórica.
- Solo una distribución puede estar vigente por período.
- Las incidencias no pueden generar conflictos internos en su propia cadena.

---

## 9. Consultas Estratégicas Soportadas

El sistema debe soportar:

- Horario vigente por persona.
- Horario vigente por unidad organizativa.
- Historial completo de asignaciones.
- Incidencias activas por período.
- Árbol completo de incidencias (consulta recursiva).
- Detección de conflictos horarios.
- Auditoría estructural básica.

---

## 10. Stack Tecnológico

Backend:
- Node.js + TypeScript
- Clean Architecture interna

ORM:
- Prisma

Base de Datos:
- PostgreSQL
- Soporte para CTE recursivas
- Constraints por institución
- Índices estratégicos para consultas horarias

Frontend:
- Next.js + TypeScript

Seguridad:
- JWT
- Roles por institución

Testing:
- Unitarios (dominio puro)
- Integración (casos de uso)
- Validaciones horarias

---

## 11. Infraestructura

- Docker-first (contenedores desde desarrollo)
- Docker Compose para entorno local
- GitHub Actions para CI
- Migraciones versionadas (Prisma Migrate)
- Seeds iniciales por institución

---

## 12. Estado Actual

- Núcleo transversal validado.
- Modelo sector-agnóstico.
- Multi-tenant estructural.
- Versionado e inmutabilidad definidos.
- Encadenamiento de incidencias soportado.
- Preparado para implementación incremental por sprints.