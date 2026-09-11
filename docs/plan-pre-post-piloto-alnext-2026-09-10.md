# ALNEXT — Plan pre-piloto / post-piloto (registrado 10/09/2026)

**Origen:** propuesta del usuario tras la auditoría UX Fase 10 (Institución, agentes y acceso, `docs/auditoria-ux-institucion-agentes-acceso-2026-09-09.md`). Revisado técnicamente y con 2 puntos ajustados antes de registrarlo.

## Contexto clave que condiciona todo el plan

El piloto es una **instalación local de un solo tenant** (una escuela, usuarios conocidos, roles cargados por seed, acceso controlado directamente por el usuario). Esto es distinto del entorno de dev/test donde se corrió la auditoría de Fase 10, que tiene **3 instituciones reales en la misma base** (Escuela N°12, Sanatorio del Sur, Colegio Ceferino). Varios hallazgos de esa auditoría (UX-ADM-001, 002, 003, 009) pierden severidad real en un tenant único — no porque el código se haya corregido, sino porque la topología del piloto reduce la superficie de esos problemas. Esta es la razón de fondo para diferirlos, no solo "no hace falta un sistema de roles todavía" — importante dejarlo explícito para cuando se retome esto con multi-tenant real.

## 🟢 Antes del piloto

1. **Cerrar auditoría UX Fase 10** — prácticamente cerrada; solo falta triage/clasificación de cada hallazgo contra este plan (ver tabla más abajo), no auditoría nueva.
2. **Seguridad mínima del piloto** (higiene básica, no negociable, no es "roles avanzados"):
   - Confirmar si las contraseñas ya están hasheadas — **primer paso a verificar, antes de asumir que falta o que está resuelto.**
   - HTTPS si aplica al modo de instalación.
   - Backups no accesibles públicamente.
3. **Reseteo de contraseña — versión mínima**: sin recuperación self-service (instalación local, sin email), un script/comando del usuario para resetear la contraseña de un usuario a mano. Depende del punto 2 (el script tiene que generar el hash con el mismo algoritmo que usa el login, si ya hashea). No hace falta UI. Documentado como decisión consciente.
   - Ajuste: el link muerto "¿Olvidaste tu contraseña?" en el login (UX-ADM-007) se puede sacar o reemplazar por un texto de contacto **ahora mismo**, sin esperar al script — es un cambio trivial.
4. **Backup automático.**
5. **Backup manual / bajo demanda.**
6. **Restauración** — cierra el ciclo de backup.
7. **Instalador** — ~5 minutos, configuración mínima, seed inicial.
   - Ajuste: el seed inicial puede cargar directamente los datos de "Mi institución" (UX-ADM-004: domicilio, teléfono, CUIT usados en headers de PDF) — no hace falta construir una pantalla para esto en un tenant único configurado una sola vez por el usuario.
8. **Instrumentación mínima del piloto** — logging/analytics básico (eventos de uso, tiempos por tarea, errores) antes de instalar en la escuela.
9. **Criterios de éxito del piloto** — definir antes de arrancar, aunque sea cualitativo.
10. **Ajuste agregado: UX-ADM-006 (errores 401 no distinguidos)** — no es un tema de permisos ni de seguridad, es usabilidad del día a día: si a un usuario se le vence la sesión durante el uso real, hoy ve "Error cargando agentes" sin entender que tiene que volver a loguearse. Afecta directamente lo que el piloto va a medir (punto 11), por eso se suma acá en vez de post-piloto.
11. **Ajuste agregado: UX-ADM-005 (texto de modal engañoso)** — costo casi nulo, se puede resolver junto con el punto 1 sin esperar a nada.
12. **Prueba final** — instalación limpia + restauración + datos realistas + recorrido completo.
13. **Piloto** — instalar en la escuela, observar uso real. Objetivo: descubrir qué usan, qué no, dónde se traban, cuánto ahorran, qué falta, y si el problema que resuelve ALNEXT tiene valor suficiente como para pagar por él.

## 🔵 Después del piloto

1. **Roles y permisos** — diseño formal usuario → institución → rol → permisos → operación. Cubre UX-ADM-001 (escalación de privilegios) y UX-ADM-002 (sesión no se invalida al quitar rol) de forma definitiva, ya con multi-tenant real en juego.
2. **Gestión de usuarios** — alta, baja, reactivación, asignación de roles (pantalla, hoy inexistente).
3. **Sesiones** — revocación, expiración, invalidación, logout forzado.
4. **Recuperación de contraseña self-service** — cuando haya usuarios reales fuera del control directo del usuario, y probablemente ya no instalación puramente local.
5. **Multiinstitución avanzado** — selector/contexto institucional (UX-ADM-009).
6. **Endurecimiento del SaaS** — cuando se pase de instalación piloto a producto multi-institución. Incluye reconsiderar UX-ADM-003 (endpoint público de instituciones) y UX-ADM-013 (rutas `/protected/*` sin protección server-side) con multi-tenant real.

## Mapeo de los 13 hallazgos de la Fase 10 contra este plan

| Hallazgo | Bucket | Nota |
|---|---|---|
| UX-ADM-001 (P0) | 🔵 Después — Roles y permisos | Severidad real baja en tenant único sin usuarios hostiles |
| UX-ADM-002 (P0) | 🔵 Después — Sesiones | Ídem |
| UX-ADM-003 (P1) | 🔵 Después — Endurecimiento SaaS | En tenant único devuelve solo los datos de esa misma escuela |
| UX-ADM-004 (P1) | 🟢 Antes — resuelto vía seed del instalador | No necesita pantalla propia |
| UX-ADM-005 (P1) | 🟢 Antes — fix trivial de texto | Sin dependencias |
| UX-ADM-006 (P1) | 🟢 Antes — agregado por impacto en usabilidad del piloto | No es tema de permisos |
| UX-ADM-007 (P1) | 🟢 Antes — script de reseteo + sacar link muerto | Depende de confirmar hasheo (punto 2) |
| UX-ADM-008 (P2) | Sin urgencia, cualquier momento | Cosmético |
| UX-ADM-009 (P2, no confirmado) | 🔵 Después — Multiinstitución avanzado | |
| UX-ADM-010 (P2) | Sin urgencia, cualquier momento | Validación menor |
| UX-ADM-011 (P3) | Sin urgencia, cualquier momento | Validación menor |
| UX-ADM-012 (P3) | Sin urgencia, cualquier momento | Consistencia menor |
| UX-ADM-013 (P2) | 🔵 Después — Endurecimiento SaaS | Bajo riesgo con tenant único controlado |

## Próximo paso inmediato

Verificar contra el código real si las contraseñas ya están hasheadas (`lib/usecases/auth/iniciarSesion.ts` y dónde se crea/compara `Usuario.password`) antes de diseñar el script de reseteo manual o dar por resuelto el punto 2 de "seguridad mínima".
