# Análisis completo — Instalador ALNEXT (auditoría de código + smoke tests en VM)

**Fecha:** 15/09/2026
**Fuentes:** `docs/auditoria-instalador-alnext.md` (auditoría de código, 13-14/09) + smoke tests reales en VM `ALNEXT-test` (14-15/09).

Este documento consolida todo lo que sabemos hoy sobre cómo construir el instalador único de ALNEXT: lo que dice el código, y lo que confirmamos probando el instalador oficial de PostgreSQL contra escenarios reales en una VM. El objetivo es que sirva de base de evidencia para encarar la implementación, sin tener que releer las dos auditorías por separado.

---

## 1. Resumen ejecutivo

La arquitectura decidida — Node portátil embebido + instalador oficial de PostgreSQL (EDB) en modo silencioso, con puerto/servicio/directorio propios — **es viable**, pero el instalador oficial de Postgres tiene comportamientos no documentados que el instalador de ALNEXT tiene que manejar activamente, no asumir. En concreto:

- Puede convivir con otra versión de Postgres ya instalada, sin pisarla (validado).
- **No** puede asumirse silencioso de verdad: si el puerto elegido está ocupado, muestra un diálogo gráfico bloqueante que cuelga el proceso si nadie está para hacer clic (riesgo crítico, validado).
- Es un proceso que se relanza a sí mismo y corre en segundo plano varios minutos; un script que lo invoque tiene que esperarlo activamente.
- Registra las instalaciones por versión mayor en el registro de Windows, no por los parámetros que se le pasan — reinstalar la misma versión mayor reutiliza/repara la instalación existente en silencio, o puede crashear.
- Requiere privilegios de administrador de forma dura (manifiesto `requireAdministrator`); no se puede lanzar por script hacia un usuario estándar sin una elevación interactiva de por medio.

Ninguno de estos hallazgos invalida la arquitectura elegida. Todos son manejables si el instalador de ALNEXT hace sus propias verificaciones *antes* de invocar al instalador de Postgres, en vez de confiar en que este último falle de forma prolija.

---

## 2. Hallazgos de la auditoría de código (`docs/auditoria-instalador-alnext.md`)

- `package.json`: nombre del proyecto es `"gestor_tmp"` (no "alnext") — dato a tener en cuenta si el instalador deriva nombres de ahí. Scripts relevantes: `dev`, `dev:test`, `build`, `start`, `seed`, `resetear-password`, `test`, y **`test:run`, que tiene hardcodeado `DATABASE_URL=postgresql://admin:admin123@localhost:5433/gestor_test?schema=public`** — este archivo SÍ está versionado en git, a diferencia de `.env`/`.env.test`.
- No hay campo `engines` en `package.json`, ni `.nvmrc`, ni CI/CD. La única restricción real de versión de Node viene indirecta, vía `node_modules/next/package.json` (`next@16.1.6` exige `node >=20.9.0`).
- `prisma/schema.prisma`: `provider = "postgresql"`, `url = env("DATABASE_URL")`, sin configuración SSL, sin pin de versión.
- `.env`/`.env.test` (gitignorados, no versionados): apuntan a puerto **5433**, bases `gestor_horarios` y `gestor_test`.
- `scripts/backup-alnext.ps1` y `restaurar-alnext.ps1`: rutas de fallback hardcodeadas a `C:\Program Files\PostgreSQL\18\bin\` — la evidencia más fuerte de que **Postgres 18 es la versión de facto requerida**, aunque nada en Prisma/schema la fuerce explícitamente.
- `lib/prisma.ts` parsea `.env.test` línea por línea a mano (no usa `dotenv`) solo cuando `NODE_ENV=test`; loguea `"DB USADA:"` por consola.
- `tests/checkMigraciones.test.ts` corre `npx prisma migrate status` y `npx prisma migrate deploy` como parte de la suite de tests — dependencia no obvia: los tests necesitan Postgres real levantado y de hecho aplican migraciones.
- `@prisma/client` (v5.22.0) tiene su propio hook `postinstall` que corre `prisma generate` en cada `npm install` — explica por qué la app "funciona sola" sin que ALNEXT declare su propio postinstall.
- `docs/ Verdades del entorno — ALNEXT.md`: asume cuenta estándar de la escuela, con admin **solo** para los pasos iniciales (Postgres, Node, Task Scheduler). Recomienda Postgres 18 nativo, y **recomienda usar el puerto 5432 por defecto asumiendo "no debería haber conflicto ahí"** — la auditoría de código ya había marcado esto como una contradicción con su propia premisa de no asumir que el puerto está libre. **Los smoke tests de esta semana confirman que esa desconfianza estaba justificada** (ver §3.3): el puerto sí puede estar ocupado, y cuando lo está, el instalador no falla limpio.
- El "esqueleto" de 14 pasos manuales documentado es solo documentación — no existe ningún artefacto de instalador real todavía.
- `docs/Diseño MVP de sistema de licencias.md` (estado: NO INICIAR, post-piloto): ya señala independientemente la tensión entre backup/restore y el estado de licencia — coincide con un riesgo que la auditoría de instalador identificó por su cuenta.

---

## 3. Hallazgos de los smoke tests en VM (evidencia real, no inferida)

Entorno: VM `ALNEXT-test` (VirtualBox, Windows 11 25H2, EFI/TPM2/Secure Boot), simulando una PC compartida de escuela. Instalador probado: `postgresql-18.6-3-windows-x64.exe` (EDB, oficial).

### 3.1 Comando de instalación silenciosa validado

```
postgresql-18.6-3-windows-x64.exe --mode unattended --unattendedmodeui none --superpassword "<pwd>" --servicename "<nombre>" --servicepassword "<pwd>" --serverport <puerto> --prefix "<ruta>" --datadir "<ruta>\data"
```

Todos estos parámetros funcionan como se espera contra la build 18.6-3. `--debugtrace "<ruta.log>"` agrega un log de diagnóstico detallado (o, si el instalador crashea, ese archivo pasa a contener únicamente un volcado de error nativo en XML/base64 en vez de la traza — ver §3.4).

### 3.2 Coexistencia entre versiones — ✅ validado, sin riesgo

Postgres 18 (puerto 5433, servicio `postgresql-alnext`) se instaló y arrancó correctamente en paralelo con Postgres 17 (puerto 5432, servicio `postgresql-x64-17`), sin tocar la instalación existente. Confirmado con conexión real (`psql` devolvió `PostgreSQL 18.6 on x86_64-windows`). El log terminó limpio (`Instalación completada`, exit code 0).

**Hallazgo operativo importante:** el instalador se relanza a sí mismo y el proceso invocado desde PowerShell vuelve al prompt en segundos, mientras el trabajo real (extraer varios miles de archivos, sobre todo de pgAdmin 4 con su propio Node embebido) sigue en segundo plano varios minutos más. **Cualquier script orquestador tiene que esperar activamente** (sondear el proceso por nombre, o `Wait-Process`) — nunca asumir que terminó cuando el comando "vuelve".

### 3.3 Puerto ya ocupado — 🔴 riesgo crítico, validado limpio

Se ocupó el puerto 5433 con un proceso genérico (no Postgres, un `TcpListener` de PowerShell) y se corrió una instalación real de Postgres 18 (primera vez, sin instalación previa de v18 en la máquina) apuntando a ese puerto.

**Resultado:** a pesar de `--unattendedmodeui none`, el instalador mostró un **diálogo gráfico bloqueante**: *"El número de puerto especificado no está disponible. Por favor ingrese un puerto diferente."* Requiere un clic humano para cerrarse. Si esto corriera desatendido (el escenario real del instalador de ALNEXT, sin nadie presente), **el proceso queda colgado indefinidamente**, no aborta solo ni devuelve un código de error utilizable por un script.

Una vez cerrado manualmente, el aborto es limpio: no crea servicio, no crea directorio de datos, no deja residuos.

**Implicación directa:** el instalador de ALNEXT no puede confiar en que el instalador de Postgres maneje un puerto ocupado de forma silenciosa. Tiene que **verificar que el puerto esté libre *antes* de invocarlo** (por ejemplo, intentando bindear un `TcpListener` de prueba, o `Test-NetConnection`), y si no lo está, elegir otro puerto o abortar con su propio mensaje.

### 3.4 Reinstalación de la misma versión mayor — ⚠️ hallazgo no planeado, pero relevante

Al intentar instalar Postgres 18 una segunda vez (con `--servicename`/`--prefix`/`--datadir` distintos, apuntando al mismo puerto ya usado por la primera instalación), el instalador **ignoró los parámetros nuevos** y reutilizó/reparó la instalación existente en la ruta original. La causa: EDB registra las instalaciones **por versión mayor** en `HKLM\SOFTWARE\PostgreSQL\Installations\postgresql-x64-18`, no por nombre de servicio ni por prefix.

- Un intento (con `--debugtrace`) terminó en un **crash** del instalador, dejando un volcado de error nativo (XML/base64, sin traza legible) en vez de un log normal.
- Un segundo intento idéntico (sin `--debugtrace`) completó "exitosamente" reutilizando la instalación existente, sin avisar que había ignorado los parámetros pedidos.

**Implicación:** el instalador de ALNEXT tiene que **verificar si ya existe una instalación de Postgres 18 registrada en la máquina antes de invocar el instalador** (por ejemplo, consultando esa clave de registro o los servicios existentes), en vez de asumir que cada ejecución es una instalación nueva. Esto es especialmente relevante para el escenario de "reintento tras instalación fallida".

### 3.5 Instalación sin permisos de administrador — ✅ evaluado, confirma lo ya documentado

Se creó una cuenta estándar de Windows (`docente`, sin privilegios de administrador) y se intentó lanzar el instalador en ese contexto mediante `Start-Process -Credential` desde PowerShell. **Falló de inmediato** con *"La operación solicitada requiere elevación"* — tanto desde una consola ya elevada como desde una normal.

Causa: el `.exe` del instalador tiene en su manifiesto la marca `requireAdministrator`; Windows no permite lanzar un proceso así por script/impersonación hacia una cuenta sin privilegios sin una sesión interactiva que pueda mostrar el diálogo de UAC.

**Implicación:** no contradice nada de lo ya documentado (`docs/ Verdades del entorno — ALNEXT.md` ya asume admin solo para los pasos iniciales) — lo confirma. En la práctica, quien instale ALNEXT va a necesitar tener a mano credenciales de administrador para aprobar el UAC en el momento. No se pudo completar el flujo interactivo exacto (doble clic como usuario estándar, viendo aparecer el diálogo de UAC pidiendo credenciales) por una limitación de la UI de la VM para cambiar de usuario — queda como único punto realmente `[NO DETERMINADO]` remanente, de bajo riesgo.

---

## 4. Riesgos y mitigaciones necesarias para el instalador de ALNEXT

| Riesgo confirmado | Mitigación necesaria en el instalador de ALNEXT |
|---|---|
| Puerto ocupado cuelga el instalador con un diálogo gráfico | Verificar que el puerto esté libre *antes* de invocar el instalador de Postgres (bind test propio) |
| El instalador de Postgres corre en segundo plano tras devolver el prompt | Esperar activamente (polling o `Wait-Process`) con un timeout razonable (~10-15 min observados) |
| Reinstalar la misma versión mayor reutiliza/repara en silencio o crashea | Detectar si Postgres 18 ya está registrado (registro de Windows o servicios) antes de instalar; decidir reuso vs instalación nueva explícitamente |
| Requiere admin duro, sin ruta de elevación silenciosa | Asumir que el instalador de ALNEXT mismo debe pedir elevación (manifiesto propio `requireAdministrator`), para que el usuario vea un solo UAC al principio, no sorpresas a mitad de proceso |
| `package.json` tiene el puerto 5433 hardcodeado en `test:run` | Corregir esto en el repo (no depende de la VM, bajo esfuerzo) — ítem ya identificado en la auditoría original |
| No hay versión de Node pineada (`engines`/`.nvmrc`) | Agregar antes de embeber el runtime portátil — bajo esfuerzo |

---

## 5. Plan de implementación actualizado

Basado en el plan original de la auditoría (§G, 7 pasos) más lo aprendido en los smoke tests:

1. **Preflight del propio instalador de ALNEXT** *(nuevo, crítico, debe ir primero)*: verificar que corre elevado (o auto-elevarse con su propio manifiesto), verificar que el puerto elegido esté libre, verificar si ya existe una instalación de Postgres 18 registrada.
2. Fijar versión exacta de Node (`engines`/`.nvmrc`) y embeber el runtime portátil.
3. Corregir el puerto hardcodeado en `package.json` (`test:run`).
4. Orquestar la instalación silenciosa de Postgres con los parámetros validados en §3.1, envuelta en espera activa (no asumir que terminó cuando el comando vuelve).
5. Automatizar usuario/base de datos/`.env`/migraciones/seed.
6. Mecanismo de arranque/parada de la app (`next start`/`next stop` equivalente, sin process manager hoy).
7. Registro automático de la tarea de backup en Task Scheduler (ya validado en sesiones previas).
8. Estrategia de actualización/upgrade de versión mayor de Postgres — ahora informada por el hallazgo de §3.4 (no asumir que una reinstalación es segura sin verificar antes).

Con el riesgo más grande (comportamiento real del instalador de Postgres) ya resuelto con evidencia concreta, el trabajo que queda es mayormente mecánico y conocido — la estimación previa de 3-6 sesiones / 2-4 semanas ya no depende de una incógnita grande.

---

## 6. Prompt sugerido para construir el instalador completo

El siguiente prompt está pensado para pasarle a Claude Code (u otra sesión con acceso directo al repo), ahora en **modo implementación** (a diferencia del prompt de auditoría anterior, que era estrictamente de análisis). Incluye como requisitos duros cada hallazgo de este documento.

```
Quiero que implementes el instalador único de ALNEXT para Windows, basado en dos documentos de evidencia ya existentes en el repo:
- docs/auditoria-instalador-alnext.md (auditoría de código, análisis del estado actual)
- docs/analisis-completo-instalador-alnext-2026-09-15.md (hallazgos de smoke tests reales contra el instalador oficial de PostgreSQL en una VM)

Leé ambos documentos completos antes de escribir código. Este es un cambio respecto a la auditoría anterior: ahora SÍ quiero que implementes, no solo que analices.

ARQUITECTURA DECIDIDA (no la cuestiones, es una decisión ya tomada):
- Windows nativo, sin Docker ni WSL2.
- Node.js portátil embebido (no depender de ningún Node preinstalado en la PC destino).
- Instalador oficial de PostgreSQL (EDB) en modo silencioso/desatendido, embebido como binario dentro del instalador de ALNEXT — no una versión portátil custom de Postgres.
- Postgres propio: puerto, directorio de datos y nombre de servicio exclusivos de ALNEXT, sin asumir que el 5432 (u otro puerto) está libre, y sin asumir que no hay otra instalación de Postgres en la máquina.
- La PC destino es compartida por la escuela: cuenta de usuario estándar para el día a día, admin solo para los pasos de instalación inicial.

REQUISITOS DUROS (surgen de evidencia real, no son opcionales):
1. El instalador de ALNEXT debe verificar que el puerto elegido para Postgres esté libre ANTES de invocar el instalador de Postgres (bind test propio). El instalador oficial de Postgres, ante un puerto ocupado, muestra un diálogo gráfico bloqueante que se cuelga indefinidamente si nadie está para cerrarlo — no se puede confiar en su manejo de errores.
2. El instalador de Postgres es asíncrono: el proceso que lo invoca vuelve al control en segundos, pero el trabajo real sigue en background varios minutos (observado ~7-10 min). Cualquier invocación debe esperar activamente (polling del proceso por nombre, con timeout) antes de asumir éxito o fallo.
3. Antes de invocar el instalador de Postgres, verificar si ya existe una instalación de la misma versión mayor registrada en Windows (clave de registro HKLM\SOFTWARE\PostgreSQL\Installations\postgresql-x64-<version>, o el servicio correspondiente). El instalador oficial, si detecta una instalación existente de la misma versión mayor, reutiliza/repara esa instalación ignorando los parámetros nuevos (puerto/servicio/directorio) sin avisar, o puede crashear. Hay que decidir explícitamente el comportamiento ante este caso (¿reusar a propósito? ¿abortar con mensaje claro?), no dejar que ocurra por default.
4. El instalador de Postgres requiere privilegios de administrador de forma dura (manifiesto requireAdministrator) y no hay forma de lanzarlo silenciosamente hacia un usuario sin privilegios. El instalador de ALNEXT debe pedir su propia elevación (UAC) al principio del proceso, para que el usuario vea un solo prompt de permisos al inicio, no sorpresas a mitad de instalación.
5. Usar exactamente esta sintaxis de invocación silenciosa, validada contra la build real (postgresql-18.6-3-windows-x64.exe):
   --mode unattended --unattendedmodeui none --superpassword "<pwd>" --servicename "<nombre>" --servicepassword "<pwd>" --serverport <puerto> --prefix "<ruta>" --datadir "<ruta>\data"

ALCANCE DE ESTA ITERACIÓN — implementar en este orden, y parar a mostrarme el resultado de cada paso antes de seguir con el siguiente:
1. Preflight: verificación de elevación + verificación de puerto libre + detección de instalación Postgres existente. Sin este paso, no seguir con nada más.
2. Fijar versión exacta de Node en package.json (engines) y .nvmrc, alineado a next@16.1.6 (requiere node >=20.9.0). No embeber el runtime portátil todavía, solo dejar la versión fijada y documentada.
3. Corregir el puerto 5433 hardcodeado en el script test:run de package.json para que lea de una variable de entorno en vez de estar fijo.
4. Recién con 1-3 resueltos y confirmados, seguí con la orquestación real de la instalación de Postgres (invocación + espera activa + manejo de los casos de los puntos 1 y 3).

No avances a los pasos de usuario/DB/migraciones/seed, arranque de la app, ni backup automático todavía — eso es para una iteración posterior, una vez validado lo anterior conmigo.

Para cada paso: explicame qué vas a hacer antes de tocar código, y después de implementarlo mostrame un resumen de los archivos tocados y por qué. Si encontrás algo en el código actual que contradiga los supuestos de este prompt, avisame en vez de asumir y seguir.
```

---

## 7. Punto NO DETERMINADO remanente

El único ítem que quedó sin confirmar de forma directa es la apariencia exacta del diálogo de UAC cuando un usuario estándar hace doble clic en el instalador de Postgres (en vez de lanzarlo por script). La evidencia indirecta (falla inmediata por falta de elevación al intentar lanzarlo por script) sugiere fuertemente que el comportamiento va a ser el UAC estándar de Windows pidiendo credenciales de administrador, pero no se verificó con los propios ojos por una limitación de la VM para cambiar de sesión de usuario. Es de bajo riesgo y no bloquea el inicio de la implementación.