# 📊 Diagrama ER – Sistema de Gestión Horaria Estructural (v3.1)

## Relaciones principales

### Institución y pertenencia de agentes

- **Institucion (1) — (N) AgenteInstitucion**
- **Agente (1) — (N) AgenteInstitucion**

Un agente puede pertenecer a múltiples instituciones.

La pertenencia institucional se materializa mediante la entidad **AgenteInstitucion**, que permite:

- separar identidad global de pertenencia institucional
- registrar identificadores institucionales
- soportar arquitecturas SaaS multi-tenant

El documento identificatorio puede definirse como **único dentro de cada institución** mediante la restricción:

```
(institucionId, documento)
```

---

### Estructura organizativa

- **Institucion (1) — (N) UnidadOrganizativa**

Cada unidad organizativa pertenece a una única institución.

No existen unidades organizativas compartidas entre instituciones.

Una unidad organizativa puede representar:

- materia
- área
- disciplina
- servicio
- actividad operativa

---

### Configuración de módulos horarios

- **Institucion (1) — (N) ModuloHorario**

Los módulos horarios son definidos por cada institución.

Ejemplo:

- lunes 08:00–08:40
- lunes 08:40–09:20
- etc.

Los módulos son **reutilizables** en múltiples distribuciones horarias.

La validación de superposición de módulos se realiza **a nivel de aplicación**.

---

### Relación entre agentes y unidades

- **Agente (1) — (N) Asignacion**
- **UnidadOrganizativa (1) — (N) Asignacion**
- **Institucion (1) — (N) Asignacion**

La entidad **Asignacion** representa la relación estructural entre:

- un agente
- una unidad organizativa
- una institución

Un agente puede tener múltiples asignaciones activas o históricas.

Una unidad organizativa puede tener **múltiples asignaciones activas**.

La coherencia horaria se valida posteriormente a nivel de distribución.

---

### Distribución horaria versionada

- **Asignacion (1) — (N) DistribucionHoraria**

La distribución horaria se versiona por asignación.

Cada modificación genera una nueva versión.

Las versiones anteriores **no se sobrescriben**, permitiendo:

- trazabilidad histórica
- auditoría estructural
- reconstrucción del estado del sistema en cualquier momento

---

### Asociación entre módulos y distribuciones

- **DistribucionHoraria (N) — (N) ModuloHorario**

Esta relación se materializa mediante la entidad intermedia:

**DistribucionModulo**

Permite:

- versionado estructural
- validación de duplicación de módulos
- control de coherencia horaria por versión

---

### Registro de incidencias

- **Asignacion (1) — (N) Incidencia**

Las incidencias representan alteraciones temporales sobre una asignación.

Ejemplos:

- licencias
- reemplazos
- ausencias
- modificaciones operativas

Las incidencias:

- siempre pertenecen a una asignación
- poseen rango completo de fechas
- se preservan como historial

---

### Encadenamiento de incidencias

- **Incidencia (1) — (N) Incidencia**

Relación recursiva mediante:

```
incidenciaPadreId
```

Permite construir cadenas jerárquicas de incidencias.

Ejemplo:

```
Licencia
   └─ Reemplazo
        └─ Subreemplazo
```

Esta estructura permite soportar múltiples niveles de derivación.

---

# Entidades clave derivadas

## DistribucionModulo

Entidad intermedia que vincula:

- una **DistribucionHoraria**
- uno o más **ModuloHorario**

Características:

- no existe de forma independiente
- su clave primaria es compuesta
- garantiza la trazabilidad estructural de cada versión de horario

---

# Notas de alineación estructural

1. Se eliminan completamente **Cargo, Designación, Escuela, Curso y Comisión** como entidades estructurales del núcleo.
2. **Asignacion** reemplaza cualquier relación normativa previa.
3. **DistribucionHoraria** permite versionado sin sobrescritura.
4. **Incidencia** es inmutable y encadenable.
5. El modelo es **sector-agnóstico y SaaS multi-tenant**.
6. No se permite eliminación destructiva de entidades estructurales; se utiliza **soft delete** o desactivación.
7. La validación de coherencia horaria ocurre en el nivel de **DistribucionHoraria**, no en **Asignacion**.

---

# Principio estructural del ER

El modelo prioriza:

- integridad histórica
- versionado explícito
- trazabilidad completa
- aislamiento multi-tenant
- coherencia horaria transversal por agente
- separación entre identidad global y pertenencia institucional