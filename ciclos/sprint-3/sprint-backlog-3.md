# 🛠 Sprint Backlog – Sprint 03

## 🔵 1. Gestión de Agentes

### 🟢 1.1 CRUD de Agentes

Implementar endpoints para gestión de agentes.

Endpoints:

POST /agentes  
GET /agentes  
GET /agentes/:id  
PATCH /agentes/:id  
DELETE /agentes/:id

Campos principales:

- nombre
- apellido
- documento
- email
- telefono
- domicilio

Relaciones:

- AgenteInstitucion

Objetivo:

Registrar las personas que participan en la estructura institucional.

---

### 🟢 1.2 Validaciones de Agente

Implementar validaciones:

DNI único por institución.

Validación de email.

No permitir eliminar un agente si tiene:

- asignaciones activas
- historial de asignaciones

Mitigación:

usar **soft delete**.

---

## 🔵 2. Gestión de Unidades Organizativas

### 🟢 2.1 CRUD de Unidades

Implementar endpoints:

POST /unidades  
GET /unidades  
GET /unidades/:id  
PATCH /unidades/:id  
DELETE /unidades/:id

Campos:

- codigoUnidad
- nombre
- tipo
- estado

Relación:

- Institucion

Objetivo:

Representar materias, áreas, disciplinas o servicios institucionales.

---

### 🟢 2.2 Validaciones de Unidad

Validaciones necesarias:

Código único por institución.

Constraint existente:
# 🛠 Sprint Backlog – Sprint 03

## 🔵 1. Gestión de Agentes

### 🟢 1.1 CRUD de Agentes

Implementar endpoints para gestión de agentes.

Endpoints:

POST /agentes  
GET /agentes  
GET /agentes/:id  
PATCH /agentes/:id  
DELETE /agentes/:id

Campos principales:

- nombre
- apellido
- documento
- email
- telefono
- domicilio

Relaciones:

- AgenteInstitucion

Objetivo:

Registrar las personas que participan en la estructura institucional.

---

### 🟢 1.2 Validaciones de Agente

Implementar validaciones:

DNI único por institución.

Validación de email.

No permitir eliminar un agente si tiene:

- asignaciones activas
- historial de asignaciones

Mitigación:

usar **soft delete**.

---

## 🔵 2. Gestión de Unidades Organizativas

### 🟢 2.1 CRUD de Unidades

Implementar endpoints:

POST /unidades  
GET /unidades  
GET /unidades/:id  
PATCH /unidades/:id  
DELETE /unidades/:id

Campos:

- codigoUnidad
- nombre
- tipo
- estado

Relación:

- Institucion

Objetivo:

Representar materias, áreas, disciplinas o servicios institucionales.

---

### 🟢 2.2 Validaciones de Unidad

Validaciones necesarias:

Código único por institución.

Constraint existente:
@@unique([institucionId, codigoUnidad])


No permitir eliminar unidad si posee asignaciones asociadas.

---

## 🔵 3. Gestión de Asignaciones

### 🟢 3.1 Creación de Asignación

Crear endpoint:

POST /asignaciones

Campos principales:

- agenteId
- unidadId
- fecha_inicio
- fecha_fin
- identificadorEstructural

Relaciones:

- Agente
- UnidadOrganizativa
- Institucion

Objetivo:

Definir el vínculo operativo entre agente y unidad.

---

### 🟢 3.2 Validaciones de Asignación

Validaciones:

El agente debe existir.

La unidad debe existir.

Ambos deben pertenecer a la misma institución.

No permitir eliminar asignación si posee:

- distribuciones horarias
- incidencias
- horarios asignados

Mitigación:

usar **soft delete**.

---

## 🔵 4. Distribución Horaria Versionada

### 🟢 4.1 Crear Distribución Horaria

Endpoint:

POST /distribuciones-horarias

Campos:

- asignacionId
- version
- fecha_vigencia_desde
- fecha_vigencia_hasta

Objetivo:

Permitir definir distintas versiones de horarios para una misma asignación.

---

### 🟢 4.2 Asignación de Módulos

Crear relación mediante:

DistribucionModulo

Endpoint sugerido:

POST /distribuciones-horarias/:id/modulos

Datos:

- moduloHorarioId

Objetivo:

asociar módulos a una distribución.

---

### 🟢 4.3 Validaciones Horarias

Validaciones necesarias:

No permitir duplicar módulo en la misma distribución.

Constraint existente:
@@id([distribucionHorariaId, moduloHorarioId])


Advertir si existen superposiciones horarias dentro de la asignación.

---

## 🔵 5. Integración con Multi-Tenant

Validar que todas las operaciones:

- lean `institucionId` desde el middleware
- filtren queries por tenant

Ejemplo:

Advertir si existen superposiciones horarias dentro de la asignación.

---

## 🔵 5. Integración con Multi-Tenant

Validar que todas las operaciones:

- lean `institucionId` desde el middleware
- filtren queries por tenant

Ejemplo:
Juan Pérez
DNI 30111222

Unidad organizativa demo
Matemática


Asignación demo


Pérez → Matemática


---

## 📊 Resultado del Sprint

Al finalizar el sprint el sistema podrá:

Registrar agentes

Registrar unidades organizativas

Crear asignaciones institucionales

Definir distribuciones horarias

Establecer la base de planificación horaria