# 🗂 Sprint Planning – Sprint 03

## 🎯 Objetivo del Sprint

Implementar el núcleo operativo del sistema de gestión horaria, permitiendo registrar agentes, unidades organizativas y asignaciones institucionales.

Además, establecer la base estructural para la planificación horaria mediante distribuciones horarias versionadas.

---

## 📦 Sprint Goal

"El sistema debe permitir registrar agentes, unidades organizativas y asignaciones institucionales, sentando las bases para la gestión de horarios."

---

## 🧩 Alcance del Sprint

Incluye:

- CRUD de Agentes
- CRUD de Unidades Organizativas
- Creación de Asignaciones
- Estructura de Distribución Horaria Versionada
- Validaciones básicas de integridad

No incluye:

- Generación automática de horarios
- Optimización de horarios
- Interfaz gráfica avanzada
- Reportes
- Gestión avanzada de reemplazos

---

## 🏗 Componentes del Núcleo Operativo

El sistema comienza a estructurarse de la siguiente forma:

Agente
↓
Asignacion
↓
DistribucionHoraria
↓
ModuloHorario


Esto permitirá posteriormente:

- planificación horaria
- detección de conflictos
- generación de horarios institucionales

---

## 📊 Definition of Done (DoD)

El sprint se considera terminado cuando:

✅ CRUD de Agentes funcionando  
✅ CRUD de Unidades Organizativas funcionando  
✅ Creación de Asignaciones operativa  
✅ Distribución Horaria Versionada implementada  
✅ Validaciones básicas funcionando  
✅ Queries respetan aislamiento multi-tenant  
✅ Migraciones Prisma aplicadas correctamente  
✅ Sistema ejecuta sin errores con `npm run dev`  
✅ Tests básicos ejecutan correctamente  
✅ Documentación guardada en

/docs/sprints/sprint-03


---

## ⚠️ Riesgos Identificados

### Duplicación de datos

Puede ocurrir si no se validan correctamente:

- documento de agente
- códigos de unidad

Mitigación:

- constraints en Prisma
- validaciones en servicios

---

### Inconsistencias de asignaciones

Asignaciones incorrectas podrían generar problemas en la planificación horaria.

Mitigación:

- validaciones antes de crear asignaciones
- restricciones de eliminación

---

### Complejidad en distribución horaria

La versión inicial debe mantenerse simple.

Mitigación:

- solo asignación manual de módulos
- versionado simple

---

## ⏱ Estimación

Duración sugerida:

1 semana

Complejidad:

Media

Riesgo técnico:

Medio

---

## 🧠 Resultado Esperado

Al finalizar el sprint el sistema permitirá estructurar la base operativa del horario institucional:


Institucion
├── Agentes
├── Unidades Organizativas
└── Asignaciones
└── Distribuciones Horarias


Esto habilita el siguiente paso del sistema:

**gestión efectiva de horarios y clases.**