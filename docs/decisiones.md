# 🏗 Decisiones Arquitectónicas – v3.2

Documento alineado con el Modelo de Dominio v3.1  
Ajustado para implementabilidad real en entorno SaaS.

---

## 1. Núcleo Sector-Agnóstico

El modelo estructural está completamente desacoplado de normativa sectorial.

Motivo:
Construir un núcleo reutilizable para cualquier organización que opere con asignaciones horarias.

Impacto:

- No existen entidades normativas obligatorias.
- Cargo, Designación u otras figuras legales no forman parte del core.
- Sectores específicos se implementan como extensiones.
- El núcleo solo modela estructura operativa:
  Persona → Asignación → DistribuciónHoraria → Incidencia.

---

## 2. Persona Contextual al Tenant

La entidad Persona pertenece a una única Institución.

Motivo:
Garantizar aislamiento real multi-tenant y reducir complejidad estructural.

Impacto:

- No existe persona global.
- Si alguien trabaja en dos instituciones, existen dos registros independientes.
- La unicidad del documento es por institución.
- No existe cruce de datos entre tenants.

Esta decisión prioriza simplicidad, seguridad y escalabilidad.

---

## 3. Asignación como Entidad Estructural Central

La Asignación es la relación estructural entre:

- Persona
- UnidadOrganizativa

Motivo:
Simplificar el modelo y evitar dependencia normativa.

Impacto:

- Es el eje del sistema.
- Toda DistribucionHoraria depende de una Asignación.
- Toda Incidencia depende de una Asignación.
- No se elimina físicamente.
- Se inactiva para preservar historial.
- La validación horaria NO ocurre en Asignación, sino en DistribucionHoraria.

---

## 4. Eliminación Lógica Obligatoria

No se permite eliminación destructiva de entidades estructurales.

Se utiliza:

- Estados Activo / Inactivo
- Fechas de vigencia
- Versionado explícito

Motivo:
Garantizar trazabilidad histórica completa.

Impacto:

- Personas no se eliminan si tienen historial.
- Unidades no se eliminan si tienen asignaciones históricas o activas.
- Asignaciones se inactivan.
- Distribuciones no se sobrescriben.
- Incidencias son inmutables.

---

## 5. Distribución Horaria Versionada y Transaccional

La DistribucionHoraria es una entidad versionada con:

- Versión incremental por asignación.
- Rango de vigencia.
- Estado.

Motivo:
Permitir cambios estructurales sin pérdida de historial.

Impacto:

- Cada modificación genera nueva versión.
- No se editan versiones anteriores.
- Solo puede existir una versión vigente por período.
- Se valida coherencia de rangos.
- Se valida superposición horaria efectiva por persona.

### Regla Técnica Crítica

La creación de una nueva versión debe ejecutarse en una operación transaccional y atómica que:

1. Valide superposición.
2. Cierre la versión vigente anterior (si existe).
3. Cree la nueva versión.
4. Asigne sus módulos.

Esto evita inconsistencias estructurales.

La verdad estructural del sistema vive en esta entidad.

---

## 6. Validaciones Estructurales Bloqueantes

Las reglas críticas se validan en capa de aplicación.

Se validan:

- Superposición horaria efectiva por persona.
- Superposición dentro de la misma asignación.
- Duplicación de módulos en una versión.
- Rango temporal inválido.
- Superposición incompatible de incidencias hijas.

Motivo:
Requieren lógica contextual que excede constraints simples de base de datos.

### Principio

Las validaciones estructurales críticas son siempre bloqueantes.

No existen advertencias no bloqueantes en el núcleo.

Esto simplifica la implementación y mantiene coherencia fuerte.

---

## 7. Incidencias Inmutables y Encadenables

Una Incidencia:

- Es inmutable.
- Tiene rango completo obligatorio.
- Puede referenciar una incidencia padre.
- Puede tener múltiples hijas.
- Forma una estructura jerárquica (árbol).

Motivo:
Permitir reemplazos temporales sin alterar historial estructural.

Impacto:

- No se editan incidencias.
- No se eliminan incidencias.
- Las hijas no pueden superponerse entre sí.
- Se puede reconstruir el árbol completo históricamente.

### Aclaración Estructural

Las incidencias NO modifican la estructura base (DistribucionHoraria).

Solo representan alteraciones temporales sobre una asignación.

La estructura versionada permanece intacta.

---

## 8. Multi-Tenant Estricto

Toda entidad estructural incluye `institucion_id`.

Motivo:
Diseñar como SaaS real desde el núcleo.

Impacto:

- No existe cruce de datos entre instituciones.
- Las validaciones de unicidad son por institución.
- Toda consulta debe ejecutarse en contexto del tenant.
- El aislamiento es regla estructural obligatoria.

---

## 9. Identificadores Estructurales Opcionales

Se permite identificador estructural opcional en Asignación.

Motivo:
Permitir adaptación a entornos que requieren códigos oficiales.

Impacto:

- No es obligatorio en el núcleo.
- Puede configurarse por institución.
- No afecta estructura base.

---

## 10. Separación Clara de Capas

Arquitectura interna:

- domain → reglas estructurales
- application → orquestación y validaciones
- infrastructure → persistencia
- interfaces → exposición (API/UI)

Motivo:
Permitir evolución sin romper el núcleo.

Impacto:

- El dominio no depende de frameworks.
- Las reglas viven fuera de la base de datos.
- La infraestructura implementa, no decide.

---

# Principio Rector

La verdad del sistema es la estructura horaria versionada.

No la normativa.
No el estado actual.
No la última modificación.

La trazabilidad histórica es obligatoria.
La eliminación destructiva está prohibida.
Las validaciones críticas son bloqueantes.
El núcleo debe ser reutilizable, coherente e implementable.
