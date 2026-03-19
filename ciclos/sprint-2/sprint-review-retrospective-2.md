# 🏁 Sprint Retrospective – Sprint 02 (Multi-Tenant)

**Fecha:** 11 de marzo de 2026  
**Duración Sprint:** 1 semana  
**Objetivo:** Implementar aislamiento multi-tenant real del sistema y configuración institucional básica.

---

## ✅ What Went Well (Lo que salió bien)
- Modelo Institución y entidades adaptadas con `institucionId` implementadas y migradas correctamente.  
- Middleware multi-tenant funcionando: se prueba con header, subdominio y falla correctamente sin tenant.  
- Seeds iniciales creados y pruebas de creación/eliminación de instituciones demo exitosas.  
- Tests de Prisma, migraciones y endpoints ejecutados sin errores (`npm run check` con código 0).  
- Aislamiento de queries por tenant aplicado correctamente.  
- Ejecución estable del sistema (`npm run dev`) sin errores en entorno local.  
- Soft delete y constraints configurados correctamente, evitando inconsistencias de datos.

---

## ⚠️ What Didn’t Go Well (Lo que no salió tan bien)
- Duplicación de instituciones demo detectada en tests (`id: 1` y `id: 11` con mismo nombre), lo que podría confundir pruebas si no se controla.  
- Configuración institucional todavía devuelve `null` cuando no hay datos; se requiere aplicar defaults en servicio (`getConfiguracionInstitucion.ts`).  
- Falta de tests unitarios para algunos casos de configuración (duración de módulo, extensiones) que podrían asegurar consistencia de comportamiento.  
- Tiempo estimado vs real: la complejidad fue media-alta y algunos ajustes de relaciones y seeds tomaron más tiempo del esperado.

---

## 💡 Actions / Improvements (Acciones para próximos sprints)
1. Control de duplicados en seeds: asegurar que instituciones demo o de prueba no se dupliquen.  
2. Servicio de configuración robusto: implementar defaults y validar valores antes de devolverlos.  
3. Agregar tests unitarios para configuración institucional: cubrir duraciones de módulo y extensiones activadas.  
4. Documentación más detallada del middleware y helpers: incluir ejemplos de uso de `getTenantPrismaClient()`.  
5. Revisión de relaciones y constraints antes de migraciones: minimizar riesgos de cambios en tablas existentes.

---

## 🧠 Reflexión General
El sprint logró **cumplir su objetivo principal**: pasar de single-tenant a multi-tenant con aislamiento lógico de datos y seeds funcionales. Los riesgos identificados (filtros por tenant, mezcla de lógica de negocio) se mitigaron con middleware y tests. Para los próximos sprints, se recomienda reforzar **tests de configuración** y la **gestión de datos demo** para asegurar estabilidad.