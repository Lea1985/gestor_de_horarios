# Punto de partida — cierre de sesión 19/09/2026

## Contexto

Continuación directa del cierre del 18/09 (Paso 5 del instalador: código de `Install-Database.ps1` completo y revisado, pendiente de validación en VM). Sesión larga, con dos frentes de trabajo distintos: (1) resolver el bloque de Administración (UX-ADM) del backlog de seguridad, y (2) retomar la validación empírica en VM del Paso 5.

## Frente 1 — Bloque de Administración (UX-ADM): decisión de scope para el piloto

Se rastreó el origen de los hallazgos #205-217 hasta `docs/auditoria-ux-institucion-agentes-acceso-2026-09-09.md` (confirmado por el usuario vía `grep`).

### Decisión de scope, con el usuario (19/09/2026)

Dado el alcance real del piloto — **una sola cuenta admin operando el sistema**, sin plan de dar de alta a docentes/personal todavía, **instalación en máquina propia sin exposición a internet**, con Postgres y la app corriendo 100% local (`localhost`) — se tomó la decisión consciente de **aceptar como riesgo conocido, no resolver ahora**:

- **#205 (P0)** — auto-promoción a ADMIN vía `/api/usuarios`: sin otro usuario que lo explote.
- **#206 (P0)** — quitar rol no invalida sesión: sin revocación de acceso en curso.
- **#207 (P1)** — `GET /api/instituciones` público: sin exposición de red, solo alcanzable desde la propia máquina.
- **#217 (P2)** — rutas `/protected/*` sin protección server-side: misma lógica que los anteriores.

Los cuatro quedan anotados como **bloqueantes duros** antes de: dar de alta un segundo usuario, habilitar cualquier pantalla de gestión de roles, o exponer la máquina a la red de la escuela/internet. No es deuda olvidada — es una condición explícita y reversible.

**#213 (P2)** se marcó como **no aplicable** en este piloto (selector de institución multi-usuario — no hay caso con una sola institución y un solo usuario).

Quedan como trabajo real, sin relación con lo anterior: **#208** (pantalla "Mi institución", ver abajo — resuelto hoy), **#212** y **#214** (cosméticos/menores, sin tocar).

## Frente 1 (continuación) — UX-ADM-004: pantalla "Mi institución" — CERRADO

Implementado y validado en vivo por el usuario en su propio navegador (no solo revisión de código):

- Investigación previa a implementar: confirmado sin riesgo el manejo de `configuracion` (JSON) en `actualizarMiInstitucion.ts` — `Prisma update` es parcial, no reemplaza el objeto completo.
- **Hallazgo real durante la implementación:** el backend (`actualizarMiInstitucion.ts`) no soporta editar `cuit`, pese a que el pedido original y el propio audit lo mencionaban como editable. Se decidió (opción elegida por el usuario) mostrar el CUIT en modo solo lectura en el formulario nuevo, y se dejó anotado aparte como **#247** (hacer CUIT editable + manejar `P2002` de la constraint `@unique`, no resuelto hoy).
- Pantalla construida en `app/protected/dashboard/mi-institucion/page.tsx`, siguiendo el patrón de UX de Agentes pero como formulario de un solo registro (no CRUD). Entradas agregadas en `Sidebar.tsx` y `Topbar.tsx`.
- Validado en vivo: carga de datos, guardado sin perder CUIT/Estado/Dominio/Creada (el punto de riesgo que se había identificado en la revisión de código), formulario funcional.
- **Corregido un problema de git:** el trabajo se había hecho por error sobre `feature/instalador-alnext` (mezclado con el instalador). Se separó a su propia rama `fix/ux-adm-004-mi-institucion` (creada desde `develop`) antes de commitear, dejando `feature/instalador-alnext` limpio con solo lo del instalador.

## Frente 2 — Paso 5 del instalador: validación en VM

### Prerrequisito (#239): código de la app en la VM — CERRADO

- **Hallazgo empírico importante:** la VM (snapshot limpia post-Paso 4) no tenía **ni git ni Node/npm/npx instalados** — confirma en la práctica el supuesto documentado sin validar en el header de `Install-Database.ps1`. Se creó **#248** (estrategia de empaquetado de Node.js + código de la app para la máquina destino), que sigue sin resolver — para hoy se instalaron ambos manualmente vía `winget` como atajo de testing, no como parte del instalador real.
- Fricciones resueltas en el camino: refresco de `PATH` tras instalar (proceso padre no se entera hasta reiniciar la sesión), política de ejecución de PowerShell bloqueando `npm` (`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- Código clonado desde GitHub (rama `feature/instalador-alnext`) a `C:\ALNEXT\app`, `npm install` corrido, 5 paquetes con install scripts bloqueados por `allow-scripts` (`@prisma/client`, `@prisma/engines`, `prisma`, `sharp`, `unrs-resolver`) aprobados manualmente, `npx prisma generate` OK.

### Escenario 1 (instalación limpia end-to-end): EN PROGRESO, 3 bugs reales encontrados y corregidos/en corrección

No se dio nada por cerrado solo con revisión de código — cada intento de correr `Install-Database.ps1` en la VM destapó un bug real, en orden:

1. **Bug del fallback de `psql.exe` (#249, no resuelto):** el fallback hardcodeado (`C:\Program Files\PostgreSQL\18\bin\psql.exe`) no coincide con la instalación real, que quedó en `C:\ALNEXT\pgsql\bin\` (confirmado vía `Get-CimInstance Win32_Service` sobre `postgresql-alnext`). Mismo patrón duplicado en `backup-alnext.ps1`/`restaurar-alnext.ps1`. Se usó `-PsqlPath` explícito como workaround para poder seguir probando; el fix de fondo queda pendiente.
2. **Bug de BOM en los archivos generados (#250, corregido y verificado por revisión de código):** `Set-Content -Encoding utf8` en Windows PowerShell 5.1 agrega BOM por default, rompiendo `JSON.parse()` en `scripts/seed-instalacion.ts` al leer `config/institucion.json`. Primer intento de fix fue erróneo (`-Encoding utf8NoBOM` no es válido en `Set-Content` de PS 5.1 — solo existe en PowerShell 7+, confirmado por el error real en VM). Fix correcto aplicado: reemplazar los dos `Set-Content` (`.env` e `institucion.json`) por `[System.IO.File]::WriteAllText(...)` con `New-Object System.Text.UTF8Encoding $false`. Revisado el diff completo, correcto y mínimo.
3. **Bug de `DATABASE_URL` no disponible para el seed (#251, diagnosticado, fix pedido a Claude Code, sin verificar en VM todavía):** `prisma migrate deploy`/`migrate status` cargan `.env` automáticamente (mecanismo de la CLI de Prisma), pero `scripts/seed-instalacion.ts` corre como script de Node suelto sin ese auto-loading, y falla con `Environment variable not found: DATABASE_URL`. Sin tocar `seed-instalacion.ts` (decisión de diseño ya tomada) — fix pedido en `Install-Database.ps1`: setear `$env:DATABASE_URL` explícitamente antes de invocar el seed, limpiar después (mismo patrón que `PGPASSWORD` en `Invoke-PsqlSuperuser`).

Con el fix de BOM aplicado, la corrida más reciente llegó más lejos que nunca: rol creado, DB creada, `.env` generado, **las 13 migraciones aplicadas y validadas sin pending/drift**, `institucion.json` generado y leído correctamente por el seed — recién falló en el primer query real de Prisma dentro del seed. El núcleo del script (rol/DB/migraciones) está funcionando correctamente.

### Cambio de método para reintentar escenarios

El restore de snapshot de VirtualBox resultó poco confiable en la práctica (varias corridas repitieron el mismo problema porque el restore no se aplicó a tiempo o se restauró sobre un archivo desactualizado). Se adoptó un método más rápido y confiable para volver a estado limpio entre pruebas del escenario 1: limpiar rol/DB a mano por `psql` (`DROP DATABASE`/`DROP ROLE`) + borrar `.env`/`config/institucion.json`, verificando con una consulta a `pg_roles` antes de reintentar. Vale la pena mantener este método para el resto de los escenarios pendientes, no depender del restore de snapshot salvo que haga falta un estado realmente distinto.

## Estado de git

- **`fix/ux-adm-004-mi-institucion`:** commiteado, con la pantalla "Mi institución" completa y validada. Pendiente de mergear/PR cuando se decida.
- **`feature/instalador-alnext`:** `Install-Database.ps1` sigue sin commitear (ahora con el fix del BOM aplicado, y pendiente el fix de `DATABASE_URL` del seed). El documento de cierre del 18/09 tampoco se commiteó todavía. Correcto no commitear nada de esto hasta que el escenario 1 cierre limpio de punta a punta.

## Pendiente para la próxima sesión

1. **PRIMER PASO DE MAÑANA — verificar el fix de #251 en VM.** El fix (`$env:DATABASE_URL` seteado en un `try/finally` antes de invocar `scripts/seed-instalacion.ts`, mismo patrón que `PGPASSWORD` en `Invoke-PsqlSuperuser`) quedó confirmado **aplicado** en `installer/Install-Database.ps1:363-378` (revisado el diff, correcto). Lo que falta es la prueba real: copiar el archivo a la VM (con el chequeo de BOM de siempre), limpiar el estado con el método rápido por `psql` (`DROP DATABASE`/`DROP ROLE` + borrar `.env`/`config/institucion.json` — no usar snapshot restore, resultó poco confiable), y correr el escenario 1 completo hasta el final. Si el seed corre OK esta vez, el escenario 1 queda cerrado por primera vez de punta a punta.
2. **Terminar de correr el escenario 1** hasta el final (seed completo, `seedOk:true`, exit 0), con verificación real por `psql` de que la institución y el admin quedaron bien cargados.
3. **Escenarios 2-6 restantes** (#241-245): permisos ACL del `.env`, re-run sin password, re-run con password (idempotencia + comportamiento del seed en una segunda corrida — sigue sin resolver qué pasa si `seed-instalacion.ts` corre dos veces sobre la misma institución), parámetros inválidos, Postgres no responde.
4. **Backlog técnico acumulado hoy, sin resolver:**
   - #247 — CUIT editable en `actualizarMiInstitucion.ts` + manejo de `P2002`.
   - #248 — estrategia de empaquetado de Node.js + código de la app (gap confirmado empíricamente, bloqueante para el instalador único de punta a punta, no para este piloto si se resuelve a mano).
   - #249 — fallback de `psql.exe` hardcodeado a ruta incorrecta (afecta también a `backup-alnext.ps1`/`restaurar-alnext.ps1`).
5. Una vez cerrado el Paso 5 completo: commitear `Install-Database.ps1` + este documento, y decidir si se mergea `fix/ux-adm-004-mi-institucion`.

## Backlog general sin tocar hoy

Igual que sesiones anteriores: #11 (datos reales Colegio Ceferino), #167-173 (45 tests desactualizados), #189, #191, #204, #212, #214, #215, #216 — todos de baja prioridad o fuera del alcance de esta sesión.