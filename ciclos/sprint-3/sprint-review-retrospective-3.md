# 🔄 Sprint Retrospective – Sprint 03

## 🧾 Resumen del Sprint
Durante el Sprint 03 se implementó el núcleo operativo del sistema de gestión horaria, logrando estructurar las entidades principales y sus relaciones.

Se construyó una base sólida para la planificación horaria institucional, incluyendo validaciones, control de integridad y soporte multi-tenant.

---

## ✅ ¿Qué salió bien?

### 🧱 Base arquitectónica sólida
- Se definió correctamente la relación:

Agente → Asignación → Distribución → Módulo

- Modelo escalable y alineado con el dominio real

### 🔐 Integridad de datos
- Uso de constraints en Prisma:
- unicidad en agentes (documento)
- unicidad en unidades (`institucionId + codigoUnidad`)
- Validaciones backend consistentes (respuestas 409)

### 🧪 Testing robusto
- Suite completa de tests:
- CRUDs
- duplicados
- integraciones entre entidades
- Automatización con `npm run check`
- Cleanup automático de datos de prueba

### 🏢 Multi-tenant funcionando
- Middleware probado:
- por header
- por subdominio
- Aislamiento de datos correcto por institución

### ♻️ Soft delete implementado
- Permite mantener historial sin romper integridad
- Validado correctamente en tests

---

## ⚠️ ¿Qué no salió tan bien?

### 🧹 Problemas en cleanup de tests
- Error de foreign key al eliminar instituciones
- Orden de borrado no siempre correcto

### 🔢 Manejo de IDs numéricos
- `Date.now()` generó valores fuera de rango para INT4
- Lección: los IDs deben respetar límites del tipo de dato

### ♻️ Generación de datos únicos
- Algunos tests generaron conflictos:
- módulos duplicados
- unidades duplicadas
- Resuelto parcialmente, pero no estandarizado

### 🧩 Complejidad creciente
- Dependencia entre entidades y tests aumentó debugging
- Señal de que el sistema ya dejó de ser trivial

---

## 🧠 ¿Qué aprendimos?

- 📌 Diseño de dominio importa: un buen modelo simplifica todo lo demás
- 📌 La base de datos es parte del backend: constraints evitan lógica innecesaria
- 📌 Testing de integración es clave: detecta errores reales y permite iterar seguro
- 📌 Multi-tenant no es trivial: requiere disciplina en cada query

---

## 🚀 ¿Qué se puede mejorar en el próximo sprint?

### 🔧 Técnico
- Estandarizar generación de datos de test
- Mejorar estrategia de cleanup (orden de borrado o cascade controlado)
- Evitar uso de números grandes fuera de rango
- Centralizar validaciones comunes

### 🧪 Testing
- Separar tests unitarios vs integración
- Reducir dependencia entre tests
- Mockear escenarios simples

### 🧱 Arquitectura
- Separar lógica en servicios (no todo en route)
- Preparar sistema para reglas de negocio más complejas

---

## 🎯 Acciones concretas para Sprint 04
- [ ] Implementar detección de solapamientos de módulos
- [ ] Crear validación de conflictos en asignaciones
- [ ] Diseñar primera versión de visualización de horarios
- [ ] Refactor inicial hacia capa de servicios

---

## 🧾 Conclusión
El Sprint 03 logró establecer una base técnica sólida y confiable para el sistema de gestión horaria.

A pesar de algunas dificultades menores en testing y manejo de datos, el sistema alcanzó un nivel de madurez suficiente para avanzar hacia funcionalidades de mayor valor, como la gestión efectiva de horarios.

---

## 🏁 Estado del Sprint
**COMPLETADO ✅**