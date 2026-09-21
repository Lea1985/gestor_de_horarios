# Punto de partida — cierre de sesión 18/09/2026

## Contexto

Continuación directa del cierre del 17/09 (Paso 4 del instalador cerrado, 6 escenarios validados en VM). Arranque de sesión con problemas de conexión (`ECONNRESET`, pérdida de paquetes ~33% confirmada por `ping`), resuelto cerrando y reabriendo Claude Code una vez estabilizada la red — no fue un problema de Anthropic ni del proyecto. A partir de ahí se avanzó con el diseño e implementación del **Paso 5** (usuario/DB/env/migrate/seed), tarea #238.

## Paso 5 — Diseño

Antes de escribir código, Claude Code revisó el código relevante (`prisma/seed.ts`, `scripts/seed-instalacion.ts`, `config/institucion.example.json`, `lib/prisma.ts`, `lib/tenant/resolveTenant.ts`, `next.config.ts`, `tests/checkMigraciones.test.ts`) y la auditoría previa del 13/09, y contestó 4 preguntas de diseño:

1. **¿Necesita autoelevación de Windows?** No — crear rol/DB es una operación de Postgres sobre TCP, no del sistema operativo. Punto a verificar en VM (no de diseño): si `C:\ALNEXT\` quedó con ACLs restrictivas por los pasos elevados anteriores, escribir el `.env` podría fallar por permisos.
2. **¿Cómo crear rol/DB de forma idempotente?** Vía `psql.exe` (mismo patrón de resolución que `backup-alnext.ps1`/`restaurar-alnext.ps1`), verificando el estado real contra `pg_roles`/`pg_database` antes de actuar — nunca infiriendo existencia del código de salida de `CREATE ROLE`/`CREATE DATABASE`.
3. **¿Qué variables de entorno necesita la app?** Solo `DATABASE_URL` (confirmado por grep en esta sesión). `DEV_TENANT_DOMAIN` y `NEXT_DIST_DIR` no aplican a una instalación real.
4. **¿Validar drift o confiar en el exit code de `migrate deploy`?** Validar — mismo criterio que `tests/checkMigraciones.test.ts`: correr `prisma migrate status` después y confirmar ausencia de `pending`/`drift`.

**Hallazgo de scope:** hay dos scripts de seed no intercambiables. `prisma/seed.ts` es fixture de desarrollo con datos reales de Colegio Ceferino (fuera de alcance, ítem #11). `scripts/seed-instalacion.ts` ya existe y ya está pensado para esto exacto (una institución + un admin desde `config/institucion.json`) — se reutiliza tal cual, sin modificarlo.

### Tres decisiones de diseño confirmadas

- **Origen de los datos de institución/admin:** parámetros del script (no un archivo `institucion.json` preparado de antemano). Se razonó en conjunto el escenario real de uso — instalación por escuela, en el momento, con datos propios de esa institución — y parámetros encaja mejor que depender de que alguien edite un JSON a mano por cada instalación.
- **Password del rol de la app (`-AppRolePassword`) si no se especifica:** se genera automáticamente (fuerte, aleatoria) y queda registrada tanto en el resumen de consola como en el JSON de salida del script — para no repetir el patrón `admin/admin123` que ya había marcado la auditoría, y para que el dato quede capturable programáticamente, no solo de pantalla.
- **Duplicación del patrón de resolución de `psql.exe`** (ya usado en `backup-alnext.ps1` y `restaurar-alnext.ps1`, sería la tercera vez): se duplica localmente en vez de extraerlo a `Common.ps1` ahora, siguiendo el mismo criterio de mínima intervención de todo el proyecto — no tocar scripts ya validados en VM por una mejora de mantenibilidad sin necesidad funcional. Queda anotado como mejora de backlog a futuro (extraer `Resolve-PgBinary` y migrar los 3 scripts juntos, con su propia validación).

## Paso 5 — Implementación

**Archivo nuevo:** `installer/Install-Database.ps1` (~370 líneas). No modifica `Install-Postgres.ps1`, `Common.ps1`, `seed-instalacion.ts` ni `checkMigraciones.test.ts`.

Comportamiento: valida entrada → resuelve `psql.exe` → verifica que Postgres responde → crea rol `alnext_app` y DB `alnext` de forma idempotente (verificado contra el catálogo, no por exit code) → genera `.env` con solo `DATABASE_URL` → `prisma migrate deploy` + `prisma migrate status` (sin confiar solo en el exit code del deploy) → genera `config/institucion.json` desde parámetros → corre `scripts/seed-instalacion.ts` tal cual existe. Exit codes 0-8 documentados y diferenciados por etapa de fallo.

### Bug real encontrado y corregido durante la implementación

`New-PasswordFuerte` usaba originalmente `[System.Security.Cryptography.RandomNumberGenerator]::Fill()`, método estático que **no existe en .NET Framework 4.x** (el runtime real de Windows PowerShell 5.1, el mismo que usa el resto del instalador) — solo existe desde .NET Core 3.0. Hubiese fallado en la VM real con "método no encontrado".

El primer intento de fix quedó **incompleto**: el diff mostrado dejaba la línea vieja rota (`RandomNumberGenerator::Fill`) conviviendo con la nueva (`RNGCryptoServiceProvider`) en el mismo bloque — se detectó al revisar el diff con atención antes de aceptarlo. Se pidió confirmación explícita del archivo completo, y en esa segunda pasada se verificó que la línea vieja **sí fue eliminada** — la función quedó con un solo camino, correcto.

### Revisión de código — sin otros bloqueantes

Repaso línea por línea del archivo completo confirmó: idempotencia correcta contra `pg_roles`/`pg_database`, escape de la password en el `CREATE ROLE` (previene inyección SQL vía `Escape-SqlLiteral`), validación de `migrate status` sin confiar en el exit code, manejo de exit codes 1-8 coherente, y el mismo patrón de `Salir`/`exit` ya usado (y validado en VM) en `Install-Postgres.ps1`.

Dos puntos menores, no bloqueantes, quedan para confirmar en VM (no en revisión de código):
- Si `scripts/seed-instalacion.ts` realmente lee el argumento `$configPath` pasado por línea de comandos, o lo ignora y busca la ruta relativa fija (en la práctica da lo mismo, porque `$configPath` coincide con esa ruta por el `Push-Location` previo — pero no está confirmado empíricamente).
- Permisos/ACLs de `C:\ALNEXT\app\` para la escritura del `.env` (ya mencionado arriba).

## Paso 5: CÓDIGO COMPLETO Y REVISADO — PENDIENTE DE VALIDACIÓN EN VM

Como en cada paso anterior, no se da nada por cerrado solo con revisión de código — hace falta la prueba empírica.

### Prerrequisito para poder probar en VM

El script asume que el código de la app ya está deployado en `C:\ALNEXT\app` (con `npm install` corrido). Esto **todavía no existe en la VM** — es paso previo obligatorio antes de poder correr cualquiera de los escenarios de abajo.

### Escenarios de validación acordados (6)

1. **Instalación limpia de punta a punta** (sin `-AppRolePassword`) → exit 0, rol/DB/`.env`/migraciones/seed OK, y verificación real conectando con `psql -U alnext_app -d alnext` usando la password que salió en el JSON, confirmando por SQL los datos de institución y admin.
2. **Permisos del `.env`** — mismo escenario, atención puntual a que la escritura en `C:\ALNEXT\app\.env` no falle por ACLs heredadas de los pasos elevados de Postgres.
3. **Re-run sin password** (rol ya creado) → exit 3, pide la password original, sin tocar nada.
4. **Re-run con password correcta** → confirmar que no recrea rol/DB, y sobre todo **qué pasa con el seed** al correr dos veces sobre la misma institución (¿`seed-instalacion.ts` tolera esto, o revienta por constraint único? — no resuelto, hay que verlo en la práctica).
5. **Parámetros inválidos** — `-AdminPassword` corta → exit 1; `-AppDir` sin `schema.prisma` → exit 1, sin tocar Postgres.
6. **Postgres no responde** (servicio detenido o puerto equivocado) → exit 3, sin invocar `psql` más allá del chequeo de puerto.

## Estado de git

Rama `feature/instalador-alnext`. Nada commiteado hoy — `installer/Install-Database.ps1` queda como archivo nuevo sin trackear, pendiente de commit recién cuando la validación en VM cierre el paso (mismo criterio que los pasos anteriores).

## Pendiente para la próxima sesión

- Deployar el código de la app a `C:\ALNEXT\app` en la VM (con `npm install`) — prerrequisito para poder correr cualquier prueba del Paso 5.
- Correr los 6 escenarios de validación de `Install-Database.ps1` listados arriba.
- Resolver lo que salga de la validación (especialmente el comportamiento de re-run del seed, sin resolver hoy).
- Si el paso cierra: commitear `installer/Install-Database.ps1` + este documento.
- Paso 6 en adelante del plan original: arranque de la app, registro de tarea de backup, estrategia de actualización — sin empezar.
- Backlog sin tocar hoy: igual que sesiones anteriores, más el nuevo ítem de mejora futura anotado hoy: extraer `Resolve-PgBinary` a `Common.ps1` y migrar `backup-alnext.ps1`/`restaurar-alnext.ps1`/`Install-Database.ps1` juntos.

## Backlog completo por prioridad (evaluación de cierre, no resuelto hoy)

Al evaluar el estado general del producto se repasó y corrigió la clasificación por prioridad de todo lo pendiente. Antes de cualquier piloto con datos reales, lo mínimo indispensable es cerrar los dos P0 — el resto no bloquea el piloto pero sí queda como deuda conocida.

**P0 — bloqueantes reales, no debería arrancar un piloto con esto abierto:**
- #205 UX-ADM-001: cualquier usuario puede crear/auto-promoverse a ADMIN vía `/api/usuarios`
- #206 UX-ADM-002: quitar el rol a un usuario no invalida su sesión activa

**P1:**
- #207 UX-ADM-003: `GET /api/instituciones` es público, expone datos de todas las instituciones
- #208 UX-ADM-004: no existe pantalla "Mi institución"

**P2:**
- #212 UX-ADM-008: nombre de usuario hardcodeado en "Usuario" en el Topbar
- #213 UX-ADM-009 (riesgo, no confirmado): sin selector de institución para usuario multi-institución
- #214 UX-ADM-010: validación de email inconsistente entre "Mi institución" y "Agentes"
- #217 UX-ADM-013: rutas `/protected/*` sin protección server-side

**P3:**
- #189 UX-DSH-007: 3 patrones visuales distintos de "cargando" en el Dashboard
- #215 UX-ADM-011: campo "Documento" del agente no valida formato
- #216 UX-ADM-012: "Reactivar" agente actualiza estado local sin refetch

**Sin prioridad P (deuda técnica y datos, aparte del backlog UX):**
- #11: cargar datos reales de Colegio Ceferino vía el mecanismo del instalador
- #167-173: 45 tests desactualizados (7 sub-ítems ya desglosados)
- #191: snapshot de % Computable en Incidencia (mejora futura, no urgente)
- #204: Fase 1 de licencias MVP (post-piloto, solo análisis)