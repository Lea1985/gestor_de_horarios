# Auditoría — Instalador autosuficiente ALNEXT (versión acotada: Node embebido + PostgreSQL vía instalador oficial)

**Fecha:** 2026-09-13
**Tipo:** Auditoría exclusiva de análisis. No se modificó código, configuración, schema, migraciones ni ningún otro archivo del repositorio durante esta tarea.
**Alcance:** determinar qué necesita ALNEXT para convertirse en una instalación autocontenida bajo la decisión ya tomada de: Node.js embebido (runtime portable propio) + PostgreSQL instalado vía el instalador oficial en modo silencioso, con puerto y directorio de datos propios (no 5432, no compartido con otra instancia de la PC).

**Convenciones de etiquetado:**
- `[EVIDENCIA]` — demostrado directamente por archivos/código/configuración del repositorio.
- `[INFERENCIA]` — deducido razonablemente de evidencia concreta; se explicita la cadena de razonamiento.
- `[NO DETERMINADO]` — el repositorio no permite determinarlo; se indica qué falta.

---

## 0. Contexto documental previo (encontrado en el propio repo)

El repositorio ya contiene documentación de continuidad reciente y directamente relevante a esta auditoría, en particular `docs/ Verdades del entorno — ALNEXT.md` (última edición 2026-09-11) y `docs/plan-pre-post-piloto-alnext-2026-09-10.md`. Esta auditoría reutiliza esa documentación como evidencia de segundo orden (documentación, no código) y la contrasta contra el estado actual del código/configuración cuando es posible. Donde hay contradicción entre esos documentos y el código actual, se señala explícitamente (ver §4, §14, §15).

Nota sobre nomenclatura: el archivo citado se llama literalmente `docs/ Verdades del entorno — ALNEXT.md` (con un espacio inicial antes de "Verdades"), tal como está en disco — no es un error de transcripción de este informe. El propio documento se marca a sí mismo como pendiente de renombrar.

---

## 1. Ejecución actual

`[EVIDENCIA]` — `package.json:6-17`:

```json
"scripts": {
  "dev": "next dev",
  "dev:test": "NODE_ENV=test next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "format": "prettier --write .",
  "seed": "node --loader ts-node/esm prisma/seed.ts",
  "resetear-password": "node --loader ts-node/esm scripts/resetear-password.ts",
  "test": "cross-env NODE_ENV=test vitest",
  "test:run": "cross-env DATABASE_URL=postgresql://admin:admin123@localhost:5433/gestor_test?schema=public vitest run --reporter=verbose"
}
```

ALNEXT es una aplicación **Next.js 16.1.6** (`package.json:26`, `node_modules/next/package.json` versión `16.1.6`). No hay servidor HTTP propio ni framework backend separado: Next.js sirve tanto la UI (App Router, `app/`) como la API (`app/api/**/route.ts`).

Cadena completa, modo desarrollo:
`npm run dev` → `next dev` (binario `next` de `node_modules/.bin/next`, invocado por npm) → CLI de Next.js levanta su propio servidor de desarrollo Node (HMR, compilación bajo demanda) → ese proceso Node ejecuta el código de `app/` (páginas y rutas API) en cada request.

Cadena completa, modo producción:
`npm run build` → `next build` (compila y genera `.next/`) → `npm run start` → `next start` (lee `.next/` y levanta un servidor Node de producción) → mismo código de `app/` sirviendo requests, sin HMR ni recompilación.

Variante de test: `npm run dev:test` fija `NODE_ENV=test` y arranca el mismo `next dev`, apuntando (vía `.env.test` / `lib/prisma.ts`, ver §5) a una base de datos separada (`gestor_test`) para poder correr los tests de endpoints contra un servidor real.

Diferencia dev/producción, documentada en el propio repo: `docs/ Verdades del entorno — ALNEXT.md:92-94` describe cómo levantar el servidor de test en background en Windows (`Start-Process powershell -ArgumentList "npm run dev:test" -WindowStyle Hidden`) y esperar con polling a que responda antes de correr los tests de endpoints — es decir, hoy no existe arranque en background nativo de la app, se resuelve con un comando de PowerShell ad hoc documentado, no un script del repo.

**Dato adicional relevante:** el `name` del proyecto en `package.json:2` es `"gestor_tmp"`, no `"alnext"` — resabio de nombre anterior. No afecta la ejecución, pero es relevante si el futuro instalador usa el `name` de `package.json` para nombrar directorios, servicios o accesos directos.

---

## 2. Inicio de Node.js

`[EVIDENCIA]`

- **Entry point real:** no hay un `server.js`/`index.js` propio. El "entry point" es siempre la CLI de `next` (`node_modules/next/dist/bin/next`), invocada indirectamente por los scripts `dev`/`build`/`start` de `package.json`.
- **Gestor de procesos:** no existe. No hay `ecosystem.config.js` de PM2, ni configuración de `systemd`, ni NSSM, ni ningún wrapper de reinicio automático en el repositorio. `pm2` no aparece como dependencia en `package.json` ni en `package-lock.json` (fuera de menciones incidentales de terceros en el lockfile, ninguna es este proyecto usándolo).
- **Servidor externo:** ninguno. No hay Nginx/Apache/Caddy en el repo, ni configuración de reverse proxy.
- **Mecanismo real de arranque/detención hoy:** manual, por línea de comandos (`npm run dev` / `npm run start`) o, para el entorno de test en Windows, el comando ad hoc de PowerShell citado en §1. No hay `.bat`/`.cmd`/acceso directo que empaquete esto.
- **Scripts auxiliares que sí ejecutan Node directamente** (fuera del ciclo Next.js), todos vía `node --loader ts-node/esm <archivo>.ts`:
  - `prisma/seed.ts` (script `seed`)
  - `scripts/resetear-password.ts` (script `resetear-password`)
  - `scripts/seed-instalacion.ts` (sin script de npm dedicado — se invoca directo: `node --loader ts-node/esm scripts/seed-instalacion.ts [config]`, según su propio docstring en `scripts/seed-instalacion.ts:14-22`)

No hay Dockerfile en producción-objetivo (ver §12): existe un `Dockerfile` en la raíz, pero está desalineado con la decisión de despliegue actual (Windows nativo, sin contenedores) — se documenta en §12 como mecanismo existente pero no vigente para el plan de instalación.

---

## 3. Versión exacta de Node.js

`[EVIDENCIA]` — no existe ninguna de las siguientes fuentes de versión en el repo:
- No hay campo `"engines"` en `package.json` (confirmado leyendo el archivo completo, 52 líneas).
- No existe `.nvmrc` en la raíz (`find . -maxdepth 2 -iname ".nvmrc"` sin resultados).
- No existe `.node-version`.
- No hay CI/CD: no existe carpeta `.github/`, ni ningún `*.yml`/`*.yaml` en el repo fuera de `node_modules` (`find . -iname "*.yml" -o -iname "*.yaml" | grep -v node_modules` sin resultados). No hay, por lo tanto, una versión de Node "comprobada por CI".

`[EVIDENCIA]` — el propio repo documenta este vacío como un pendiente abierto, no resuelto: `docs/ Verdades del entorno — ALNEXT.md:73`:

> "Sigue pendiente fijar la versión exacta con `engines` en `package.json` o `.nvmrc` (no resuelto todavía, aplica igual en Windows que en WSL2 — ver 'Abierto' arriba)."

`[EVIDENCIA]` — sí existe una restricción real, pero indirecta: viene de una dependencia, no de configuración propia del proyecto. `node_modules/next/package.json` (paquete `next`, versión exacta `16.1.6`, la misma que fija `package.json:26` sin rango — `"next": "16.1.6"`) declara:

```json
"engines": { "node": ">=20.9.0" }
```

Como `package-lock.json` fija `next` en `16.1.6` exacto (no un rango `^`/`~`), esta es la versión de Node que **Next.js 16.1.6 exige realmente para correr** — es la restricción más fuerte y concreta que impone el árbol de dependencias actual. `react` (`19.2.3`) declara `"engines": {"node": ">=0.10.0"}`, una cota tan baja que no aporta restricción real.

`[EVIDENCIA]` — el `Dockerfile` (líneas 4 y 22) usa `FROM node:20-slim` en ambos stages, consistente con la familia Node 20, pero sin fijar un patch exacto (la imagen `20-slim` sigue la última build de la serie 20.x en el momento del build, no una versión congelada) — no es una fuente de "versión exacta", es un piso de familia mayor.

**Distinción pedida:**

| Categoría | Valor | Fuente |
|---|---|---|
| Versión mínima real (impuesta por dependencia) | Node ≥ 20.9.0 | `node_modules/next/package.json` → `engines.node`, para la versión exacta de `next` fijada en `package.json`/`package-lock.json` |
| Versión recomendada por el proyecto | `[NO DETERMINADO]` | No hay ningún archivo del repo que recomiende una versión más allá del mínimo de Next |
| Versión usada actualmente en desarrollo | `[NO DETERMINADO]` | El repo no registra qué versión de Node corre la máquina de desarrollo del usuario. (El entorno donde se ejecutó esta auditoría reporta `v24.16.0`, pero es el sandbox de esta sesión, no necesariamente la máquina de desarrollo real del usuario — no se toma como evidencia del proyecto) |
| Versión comprobada por CI | No aplica — no existe CI/CD en el repo | — |
| Versión estrictamente necesaria | Node ≥ 20.9.0 (piso duro de Next 16.1.6); no hay evidencia de un techo superior probado o no probado | `node_modules/next/package.json` |

**Discrepancia a documentar:** el plan de instalación en Windows nativo (`docs/ Verdades del entorno — ALNEXT.md:73`) dice indistintamente "Node.js LTS" sin fijar versión, mientras que la dependencia real exige ≥20.9.0. Node 20 es LTS al momento de escribir esto, así que no hay contradicción de fondo, pero "LTS" tal como está escrito no es una instrucción reproducible (la LTS activa cambia con el tiempo; un instalador embebido necesita una versión exacta congelada, no un alias móvil).

---

## 4. Configuración de PostgreSQL

`[EVIDENCIA]` — `prisma/schema.prisma:5-8`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Toda la configuración de conexión (host, puerto, usuario, base, contraseña) viaja **exclusivamente** dentro de la cadena `DATABASE_URL`; Prisma no tiene aquí parámetros sueltos de host/puerto/usuario fuera de esa URL. No hay configuración de SSL — ni `sslmode` en ninguna `DATABASE_URL` encontrada, ni parámetros de SSL en `schema.prisma`. `[NO DETERMINADO]` si el motor real (Postgres 18 nativo, según docs) exige o no SSL — no depende del repo sino de cómo se configuró el servidor Postgres fuera de él.

`[EVIDENCIA]` — valores concretos encontrados en el árbol de trabajo (no versionados, ver §5):
- `.env`: `DATABASE_URL="postgresql://admin:admin123@localhost:5433/gestor_horarios?schema=public"`
- `.env.test`: `DATABASE_URL="postgresql://admin:admin123@localhost:5433/gestor_test?schema=public"`

Usuario `admin`, contraseña `admin123` (contraseña real de desarrollo, no un placeholder — se deja tal cual porque no es una credencial de producción real ni secreta más allá de esta base local de desarrollo, pero **se recomienda no reutilizar este patrón de credenciales en instalaciones reales** — punto para el futuro instalador, no una corrección de esta auditoría).

**Versión de PostgreSQL esperada — para el dimensionamiento del instalador silencioso:**

`prisma/schema.prisma` **no fija ninguna versión de PostgreSQL** — Prisma no tiene un campo para eso en el datasource; el `provider = "postgresql"` es agnóstico de versión mayor.

`[EVIDENCIA]` — sin embargo, hay evidencia operativa consistente y repetida de que el proyecto usa **PostgreSQL 18** en la práctica, en dos lugares distintos del código/config (no solo documentación):
- `scripts/backup-alnext.ps1:50`: fallback hardcodeado si `pg_dump` no está en el PATH → `"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"`.
- `scripts/restaurar-alnext.ps1:68`: mismo patrón para `psql` → `"C:\Program Files\PostgreSQL\18\bin\psql.exe"`.

Estos son *fallbacks* de scripts reales del repo (no documentación), y ambos asumen la ruta de instalación por defecto de PostgreSQL 18 en Windows. Es la evidencia más fuerte y más cercana a "código" de qué versión se usa realmente.

`[EVIDENCIA]` (documentación, corrobora lo anterior) — `docs/ Verdades del entorno — ALNEXT.md:74`: "**PostgreSQL 18 nativo** — instalador oficial de EDB..."; y `docs/punto-de-partida-clase-programada-2026-07-30.md:28`: "Postgres: confirmado nativo (apt, Postgres 18, systemd)" (esto último de la etapa WSL2/Linux, ya superada por el pivote a Windows nativo, pero coincide en la versión mayor: 18).

`[INFERENCIA]` — como el schema no usa extensiones de Postgres (`[EVIDENCIA]`: `grep` sobre todos los `migration.sql` no encontró `CREATE EXTENSION`, `GENERATED ALWAYS`, `gen_random_uuid` ni sintaxis específica de una versión mayor — el único hallazgo de tipo de dato "moderno" es `JSONB`, disponible desde PostgreSQL 9.4, muy por debajo de cualquier versión mayor considerada aquí), es razonable inferir que ALNEXT no depende de una característica exclusiva de PostgreSQL 18 y probablemente funcionaría sobre otras versiones mayores recientes (15, 16, 17). Pero **la versión que hay que empaquetar/descargar para el instalador silencioso, en la práctica, es 18** — es la única versión con evidencia real de uso (scripts + docs), y es la que hay que validar de punta a punta, no una versión mayor "compatible en teoría".

**Conclusión de esta sección:** no hay un requisito de versión impuesto por Prisma o por el schema; el requisito real es de facto (18), impuesto por convención operativa (rutas hardcodeadas en los scripts de backup/restore) y por lo ya validado en la práctica según la documentación de sesión. Esto determina qué instalador oficial de PostgreSQL habría que descargar y empaquetar: **PostgreSQL 18 para Windows x64**.

---

## 5. DATABASE_URL

`[EVIDENCIA]` — dónde se construye/lee y quién la consume:

1. **Prisma (schema + Prisma Client + Prisma CLI):** `prisma/schema.prisma:7` — `url = env("DATABASE_URL")`. Tanto `prisma migrate`, `prisma generate` (indirectamente) como el cliente generado leen esta variable de entorno.
2. **`lib/prisma.ts`** (singleton de `PrismaClient` usado por toda la app — proxy, rutas API, use cases):
   ```ts
   if (process.env.NODE_ENV === "test") {
     const envPath = path.resolve(process.cwd(), ".env.test")
     if (fs.existsSync(envPath)) {
       const lines = fs.readFileSync(envPath, "utf-8").split("\n")
       for (const line of lines) {
         const match = line.match(/^([^=]+)=(.*)$/)
         if (match) {
           process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "")
         }
       }
     }
   }
   console.log("DB USADA:", process.env.DATABASE_URL)
   const prisma = new PrismaClient({
     datasources: { db: { url: process.env.DATABASE_URL } },
   })
   ```
   Es decir: **solo cuando `NODE_ENV === "test"`**, este archivo parsea a mano `.env.test` línea por línea (no usa la librería `dotenv` acá) e inyecta las variables en `process.env`. Para cualquier otro `NODE_ENV`, este archivo no carga ningún `.env` — depende de que `DATABASE_URL` ya esté en el entorno del proceso cuando arranca.
3. **`tests/setup.ts`** (usado solo por Vitest, vía `vitest.config.ts:9` → `setupFiles: ["./tests/setup.ts"]`):
   ```ts
   import dotenv from "dotenv"
   dotenv.config({ path: ".env.test" })
   ```
   Carga `.env.test` con la librería `dotenv` real, antes de que corran los tests.
4. **`package.json:16`**, script `test:run`, fija `DATABASE_URL` **hardcodeada de forma literal** vía `cross-env` en el propio comando (ver detalle y riesgo en §15):
   ```
   cross-env DATABASE_URL=postgresql://admin:admin123@localhost:5433/gestor_test?schema=public vitest run --reporter=verbose
   ```
5. **`next dev` / `next start`** (modo normal, no test): no hay código propio que cargue `.env` explícitamente para estos modos. `[INFERENCIA — basada en comportamiento estándar y documentado de Next.js, no verificado con código propio del repo]`: Next.js carga automáticamente `.env`, `.env.local`, `.env.development`/`.env.production` desde la raíz del proyecto al arrancar `next dev`/`next build`/`next start`; esto explicaría por qué `.env` (sin sufijo) alcanza para que la app funcione en desarrollo sin que ningún archivo del repo la cargue explícitamente. No se encontró en el repo una prueba directa de este comportamiento (sería necesaria una ejecución real para confirmarlo con certeza absoluta), pero es consistente con que no exista otro mecanismo de carga para el modo no-test.
6. **Scripts standalone** (`prisma/seed.ts`, `scripts/resetear-password.ts`, `scripts/seed-instalacion.ts`), ejecutados vía `node --loader ts-node/esm <script>.ts` **fuera** del ciclo de Next: ninguno de estos tres archivos importa `dotenv` explícitamente (confirmado leyendo los tres completos). `[INFERENCIA]`: para que `DATABASE_URL` llegue a `PrismaClient` en estos scripts, Prisma Client debe estar auto-cargando el `.env` de la raíz del proyecto en tiempo de ejecución (comportamiento documentado de Prisma: el cliente generado busca un `.env` junto al `schema.prisma` o en la raíz del proyecto) — comportamiento de la librería, no código propio verificado en este repo. `[NO DETERMINADO]` con certeza total sin ejecutar estos scripts en un entorno controlado y observar si fallan sin `.env` presente.

**Valores por defecto:** no hay ningún valor por defecto hardcodeado dentro del código de la aplicación si `DATABASE_URL` falta — Prisma directamente falla al no encontrar la variable (comportamiento estándar de Prisma, no verificado con un test explícito en este repo, `[INFERENCIA]`).

**Dependencia de `.env` vs. entorno del sistema:** para el flujo normal (no test), el mecanismo depende pura y exclusivamente de un archivo `.env` en la raíz (cargado por Next.js/Prisma, no por código propio) — no hay una ruta donde ALNEXT lea `DATABASE_URL` de una variable de entorno de sistema configurada aparte del archivo `.env`.

**Credenciales:** usuario `admin`, contraseña `admin123` en ambos `.env`/`.env.test` reales del entorno de desarrollo (no son secretos de producción, ver nota en §4). No se encontraron credenciales de un cliente/institución real (piloto Colegio Ceferino) en ningún archivo del repositorio.

---

## 6. Dependencia del PostgreSQL global

`[EVIDENCIA]` — no existe en el repositorio ningún mecanismo de: detección de instancias de PostgreSQL existentes en la máquina, selección de puerto libre, ni instalación/aprovisionamiento de PostgreSQL. El único contacto entre ALNEXT y PostgreSQL es la cadena `DATABASE_URL` (§5) apuntando a un `host:puerto` fijo, más los scripts de backup/restore que asumen una ruta de instalación (§4).

Consecuencias por escenario, según lo que el repo permite determinar:

- **A. PostgreSQL instalado (una instancia, puerto libre 5433):** `[EVIDENCIA]` — funciona, es exactamente el escenario de desarrollo actual documentado (`.env` apunta a `localhost:5433`).
- **B. PostgreSQL no instalado:** `[INFERENCIA]` — Prisma fallará al conectar (error de conexión rechazada) en el primer intento de acceso a la base, tanto en `next dev/start` como al correr migraciones o el seed. No hay ningún chequeo previo ni mensaje de error específico de ALNEXT para este caso — el error que vería un instalador/usuario sería el error crudo de Prisma, no uno propio de la app. No se encontró manejo de este caso en `lib/prisma.ts` ni en el proxy.
- **C. PostgreSQL en otra versión mayor (ej. 15 en vez de 18):** `[INFERENCIA]` — dado que no se usan extensiones ni sintaxis específica de 18 (§4), es razonable esperar que conecte y funcione si el usuario/base/puerto existen con los mismos valores. Pero los scripts de backup/restore (`backup-alnext.ps1`, `restaurar-alnext.ps1`) fallarían al *localizar* `pg_dump`/`psql` si no están en el PATH, porque su fallback está hardcodeado a la ruta de instalación de la versión 18 (`C:\Program Files\PostgreSQL\18\bin\...`) — fallarían con "No se encontró pg_dump/psql en: ...", no silenciosamente.
- **D. PostgreSQL en otro puerto:** `[EVIDENCIA]` — si el puerto real no coincide con el de `DATABASE_URL`, la conexión falla; no hay descubrimiento dinámico de puerto en ningún lugar del repo (confirmado por ausencia total en los `grep` realizados sobre puertos, ver §15).
- **E. Varias instalaciones de PostgreSQL en la misma PC:** `[NO DETERMINADO]` desde el repo — el comportamiento depende de cuál de esas instalaciones esté efectivamente escuchando en el puerto configurado en `DATABASE_URL`; ALNEXT no tiene forma de elegir ni de saber cuál es cuál, porque no hace ninguna verificación más allá de intentar conectar a `host:puerto`.
- **F. Otro sistema ya usa el puerto que ALNEXT esperaría usar:** `[EVIDENCIA — ausencia de mitigación]` — no existe en el repo ningún mecanismo que detecte esto antes de intentar usar el puerto (ver hallazgo central de §15). Si otro proceso ya escucha en ese puerto, el comportamiento depende de qué haga *ese otro proceso* con las credenciales/protocolo de ALNEXT — fuera del control y del conocimiento de este repositorio.

**Conclusión:** `[EVIDENCIA]` ALNEXT depende hoy, en su totalidad, de un PostgreSQL "externo" en el sentido de que nada en el repo lo instala, lo verifica ni lo administra — es responsabilidad 100% externa (del entorno/instalador humano), consistente con que la versión acotada de instalador decidida por el usuario delegue esa responsabilidad al instalador oficial de PostgreSQL en vez de resolverla con código propio.

---

## 7. Migraciones Prisma

`[EVIDENCIA]` — comandos y ubicación:

- Migraciones versionadas en `prisma/migrations/` — 13 migraciones reales (`ls prisma/migrations`), desde `20260515213133_init` hasta `20260805185800_add_ultima_resolucion_clases`, más `migration_lock.toml` (`provider = "postgresql"`, sin más contenido — el lockfile de Prisma no fija versión de motor, solo el proveedor).
- **`tests/checkMigraciones.test.ts:15,27`** ejecuta, como parte del test suite:
  ```ts
  const output = runCommand("npx prisma migrate status").toLowerCase()
  ...
  runCommand("npx prisma migrate deploy")
  ```
  Es decir: **el propio test suite corre `prisma migrate deploy` como parte de una prueba automatizada**, no solo como paso manual de instalación. Esto requiere PostgreSQL disponible y accesible en el momento de correr los tests — es una dependencia dura para poder ejecutar `npm run test`/`npm run test:run` completos.
- No se encontró ningún `prisma migrate dev` invocado desde ningún script de `package.json` (ese comando es interactivo/de desarrollo, coherente con que no aparezca en scripts pensados para automatización).
- No hay uso de `prisma db push` en ningún script (`grep` dirigido sin resultados fuera del propio lockfile de dependencias).
- **¿Se ejecutan automáticamente?** `[EVIDENCIA]` no hay ningún script de `package.json` que dispare migraciones automáticamente durante `npm install`, `npm run build` o `npm start` — no hay `postinstall` ni `prebuild` que invoque `prisma migrate`. El único lugar del repo donde se ejecuta una migración fuera de una corrida manual explícita es el test citado arriba.
- **Plan de instalación documentado** (`docs/ Verdades del entorno — ALNEXT.md:79`): paso 7, `npx prisma migrate deploy`, como paso manual explícito del procedimiento de instalación en máquina nueva — no automatizado por ningún script del repo, es un paso que el operador humano ejecuta a mano según la documentación.

**Conclusión:** las migraciones requieren PostgreSQL disponible en el momento de ejecutarlas (obligatorio, es su función), se ejecutan hoy de forma manual (`npx prisma migrate deploy`) según la documentación de instalación, y adicionalmente se ejecutan automáticamente dentro del test suite (`checkMigraciones.test.ts`), no durante instalación real de producto.

---

## 8. Generación de Prisma Client

`[EVIDENCIA]` — dos mecanismos distintos coexisten:

1. **Dockerfile** (líneas 16-17), paso explícito y manual dentro del build de la imagen:
   ```dockerfile
   RUN npx prisma generate
   RUN npm run build
   ```
2. **Postinstall automático del propio paquete `@prisma/client`.** Se inspeccionó directamente `node_modules/@prisma/client/package.json` (versión instalada: `5.22.0`, coincide con el rango `^5.22.0` de `package.json:22`):
   ```json
   "scripts": {
     "generate": "node scripts/postinstall.js",
     "postinstall": "node scripts/postinstall.js"
   }
   ```
   Esto significa que **cada `npm install` en este proyecto dispara automáticamente `prisma generate`** (vía el hook `postinstall` del paquete `@prisma/client`), sin que el propio `package.json` de ALNEXT tenga que declarar un script `postinstall` — el hook viene empaquetado dentro de la dependencia. Es un comportamiento real y verificable del árbol de dependencias instalado, no una suposición sobre npm en general.

**¿Qué pasa en una instalación limpia?** `[EVIDENCIA]`: al correr `npm install` sobre un checkout nuevo, el Prisma Client se regenera automáticamente por el postinstall de `@prisma/client`, siempre que:
- el proceso de `npm install` no se ejecute con `--ignore-scripts` (que desactivaría todos los hooks de postinstall, incluido este), y
- exista un `schema.prisma` accesible en la ubicación esperada por Prisma (`prisma/schema.prisma`, presente en el repo).

No se encontró ninguna instrucción en el repo que use `--ignore-scripts`, así que el camino normal (`npm install` sin flags) genera el cliente automáticamente. **Contradicción menor a documentar:** el `Dockerfile` corre `npx prisma generate` explícitamente después de `npm install` (línea 16), lo cual es redundante dado el postinstall automático — no es un error funcional (correrlo dos veces no rompe nada), pero indica que quien escribió el Dockerfile no contaba con (o prefirió no depender de) el postinstall automático del paquete.

---

## 9. Backup

`[EVIDENCIA]` — sí existe un mecanismo real, propio del repo: **`scripts/backup-alnext.ps1`** (PowerShell, 84 líneas).

Resumen de lo que hace, con evidencia línea por línea:
- Resuelve la cadena de conexión desde `-DatabaseUrl` (parámetro explícito) o, si no se pasa, leyendo `DATABASE_URL` del `.env` del proyecto (líneas 31-42).
- Resuelve `pg_dump.exe`: primero busca en el `PATH` (`Get-Command pg_dump`), si no lo encuentra usa el fallback hardcodeado a PostgreSQL 18 (línea 50, ver riesgo en §4/§B).
- Ejecuta `pg_dump` en formato plano (`--format=plain`), explícitamente **para poder restaurar con `psql` sin depender de `pg_restore`** (comentario propio, línea 66).
- Guarda el archivo en `backups/` (relativo al script, fuera de lo que la app sirve por HTTP — comentario línea 4-5), con nombre `alnext_backup_<timestamp>.sql`.
- Aplica retención: conserva solo los últimos `N` backups (`-RetenerUltimos`, default 14), borra el resto.
- Pensado explícitamente para correr como tarea programada de Windows (Task Scheduler) — comentario líneas 14-18 y, en `docs/ Verdades del entorno — ALNEXT.md:83-90`, los comandos reales de `Register-ScheduledTask` ya probados, con dos triggers (al iniciar sesión + cada 4 horas).

No existe ningún backup automático activado por el propio código de la aplicación (Node/Next) — es exclusivamente un script externo de PowerShell + una tarea programada del sistema operativo, documentada pero **no registrada por ningún instalador**: hoy se configura a mano siguiendo el procedimiento documental (`Register-ScheduledTask ...`), no hay un script en el repo que la registre automáticamente.

La carpeta `backups/` está en `.gitignore` (`.gitignore:45`, "Backups de base de datos (contienen datos reales, nunca se versionan)") y **no existe actualmente en el árbol de trabajo** (`ls backups/` → no existe) — se crea recién cuando el script corre por primera vez (línea 59-61 del script: `New-Item -ItemType Directory` si no existe).

---

## 10. Restore

`[EVIDENCIA]` — **`scripts/restaurar-alnext.ps1`** (117 líneas), complemento directo del backup:

- Recibe `-BackupFile` (obligatorio) y opcionalmente `-DatabaseUrl` (mismo criterio de fallback al `.env` que el script de backup).
- Resuelve `psql.exe` con la misma lógica PATH-primero-fallback-18 que el backup.
- **Pide confirmación explícita** (líneas 76-88): el usuario debe tipear el nombre exacto de la base de datos para continuar; si no coincide, cancela sin tocar nada.
- Termina conexiones activas a la base destino (`pg_terminate_backend`), la borra (`DROP DATABASE IF EXISTS`) y la vuelve a crear vacía (`CREATE DATABASE`), y recién ahí carga el archivo de backup con `psql -f`.
- Es explícitamente **destructivo y sin deshacer** (comentario línea 4-6 del propio script, y advertencia en pantalla líneas 77-82).

`docs/plan-pre-post-piloto-alnext-2026-09-10.md:20` documenta que el ciclo completo backup→borrar→restaurar→confirmar fue probado de punta a punta el 10-11/09/2026. No hay ningún mecanismo de restore automatizado ni disparado por la aplicación — es enteramente manual, invocado por un operador humano.

---

## 11. Arranque y detención

`[EVIDENCIA]` — no existe ningún mecanismo formal de arranque/detención/reinicio de ALNEXT (la aplicación Next.js en sí) en el repositorio:
- No hay PM2 (`ecosystem.config.js` no existe, `pm2` no es dependencia real del proyecto).
- No hay definición de servicio de Windows para la app (ni NSSM ni `sc.exe` ni ningún script que registre un servicio).
- No hay `systemd` unit (coherente con el pivote a Windows nativo, §14).
- No hay `.bat`/`.cmd` de arranque en `scripts/` (los únicos archivos allí son `.ps1` de backup/restore y `.ts` de seed/reset-password).
- El único mecanismo formal que sí existe y está automatizado como tarea del sistema operativo es el de **backup** (Windows Task Scheduler, §9) — no el de la aplicación en sí.

El arranque de la app hoy es manual (`npm run dev` / `npm run start`) o, para tests, el comando ad hoc de PowerShell documentado en `docs/ Verdades del entorno — ALNEXT.md:92-96`. **No hay mecanismo formal de arranque/detención de la aplicación — esto es un vacío real, no solo no automatizado.**

---

## 12. Mecanismo de instalación actual

`[EVIDENCIA]` — distinción exacta entre "documentación de instalación" y "un instalador real":

- **Existe documentación de instalación**, extensa y reciente: `docs/ Verdades del entorno — ALNEXT.md` (sección "Esqueleto del plan de instalación en máquina nueva", líneas 68-100) describe 14 pasos manuales para instalar ALNEXT en una PC de escuela con Windows nativo — instalar Node, instalar PostgreSQL 18 vía instalador oficial, clonar el repo, `npm install`, copiar `.env`, `prisma migrate deploy`, `npm run seed`, cargar datos, registrar la tarea de backup, etc.
- **No existe un instalador real** (ningún ejecutable/paquete/script único que automatice esos 14 pasos). No hay `setup.exe`, no hay instalador `.msi`, no hay script `.ps1`/`.bat` que orqueste el proceso completo — cada paso del "esqueleto" se ejecuta a mano, comando por comando, según la documentación.
- **Docker:** existe un `Dockerfile` (raíz del repo, 33 líneas, build multi-stage con `node:20-slim`), pero **no está alineado con la decisión de despliegue actual**. El pivote a Windows nativo (documentado en `docs/ Verdades del entorno — ALNEXT.md:70` y `docs/plan-pre-post-piloto-alnext-2026-09-10.md:95-97`) fue tomado explícitamente para dejar de depender de contenedores/WSL2, por la fragilidad de un scheduler dentro de un contenedor/WSL2 en máquinas que se apagan. El `Dockerfile` sigue en el repo pero es, a la luz de esa decisión, un mecanismo de instalación/despliegue **obsoleto para el objetivo de esta auditoría**, no algo a integrar en el instalador de escuela.
- **Servicios:** ninguno se instala ni configura hoy vía ningún mecanismo del repo (ver §14).
- **Scripts propios más cercanos a "instalación"**: `scripts/seed-instalacion.ts` (crea la institución real + usuario admin inicial a partir de `config/institucion.json`) y los scripts de backup/restore — son piezas de un futuro instalador, no un instalador en sí.

**Conclusión:** hoy existe *documentación de instalación manual* validada en la práctica (según los propios informes de sesión), pero **no existe ningún instalador real** en el sentido de un artefacto ejecutable único.

---

## 13. Instalación limpia desde cero

Inventario de todo lo que se asume que ya existe en la máquina destino, contrastado contra qué hace ALNEXT hoy respecto a cada elemento:

| Elemento | ¿ALNEXT lo instala hoy? | ¿Lo configura? | ¿Lo da por existente? | Evidencia | Impacto para el futuro instalador |
|---|---|---|---|---|---|
| Node.js (runtime) | No | No | Sí, totalmente | Sin `engines`, sin `.nvmrc`; ningún script instala Node | Debe embeberse un runtime propio (decisión ya tomada) |
| npm | No | No | Sí | `package.json` asume `npm install`/`npm run` disponibles | El runtime embebido debe incluir `npm` (o resolver instalación de deps de otro modo) |
| PostgreSQL (motor) | No | No | Sí, totalmente | Ningún script instala Postgres; `DATABASE_URL` asume que ya existe un servidor escuchando | Debe invocarse el instalador oficial de Postgres (decisión ya tomada) |
| Usuario/rol de PostgreSQL (`admin`) | No | No (solo se referencia en `.env`) | Sí | `.env`/`.env.test` referencian `admin:admin123`, ningún script `CREATE USER`/`CREATE ROLE` encontrado en el repo | El instalador debe crear el usuario/rol propio, vía `psql` o similar (paso 7 de §D) |
| Base de datos (`gestor_horarios`) | No (la crea implícitamente `prisma migrate deploy` si no existe, comportamiento estándar de Prisma) | Parcial — la migración crea el esquema, no la base en todos los casos | Parcialmente | `prisma/migrations/`, `docs/.../líneas 79-80` (`prisma migrate deploy`, `npm run seed`) | El instalador debe decidir explícitamente si crea la base antes de migrar o delega en Prisma |
| Puerto de PostgreSQL libre | No | No | Sí — asume 5433 libre (hardcodeado en `test:run`, ver §15) | `package.json:16`, `.env`, `.env.test` | Riesgo directo documentado en §15/§B — requiere detección dinámica |
| Variables de entorno (`.env`) | No | Parcial — hay un `.example.json` de config de institución, no de `.env` | Sí, se asume que alguien copia/crea `.env` a mano | No existe `.env.example` en el repo (`ls -la` de la raíz no muestra ese archivo) | El instalador debe generar el `.env` real (paso 8 de §D) |
| Permisos de administrador | No verificado por ningún script | No | `[NO DETERMINADO]`, ver §17 | — | Ver §17 |
| Herramientas CLI de Postgres (`pg_dump`, `psql`) en PATH | No | No | Parcialmente — los scripts de backup/restore intentan el PATH primero, con fallback hardcodeado a la ruta de instalación estándar de la v18 | `scripts/backup-alnext.ps1:46-51`, `scripts/restaurar-alnext.ps1:64-69` | Si el instalador oficial de Postgres no agrega esas rutas al PATH, los scripts igual funcionan gracias al fallback — pero el fallback está atado a la v18 y a la ruta default |
| Prisma CLI / Prisma Client | Parcial — se instala como dependencia npm, y el cliente se autogenera vía postinstall (§8) | Sí, automático | No | `package.json` (`prisma`, `@prisma/client` en dependencias), `node_modules/@prisma/client/package.json` (`postinstall`) | Ya cubierto por `npm install` dentro del runtime embebido |
| Directorio de instalación / estructura de carpetas | No | No | Sí — se asume un `git clone` manual a una ruta arbitraria (ej. `C:\ALNEXT\gestor_clean` en la documentación) | `docs/ Verdades del entorno — ALNEXT.md:77` | El instalador debe definir y crear una estructura de carpetas propia (ver §C) |
| Servicio de Windows (app) | No | No | No aplica — no existe el concepto hoy | Ver §11 | A definir en el instalador (mecanismo de arranque, ver §D) |
| Tarea programada de backup | No, se registra a mano hoy | Parcial — el script de backup existe, el comando `Register-ScheduledTask` está documentado pero no automatizado | Sí, hoy se ejecuta manualmente siguiendo la documentación | `docs/ Verdades del entorno — ALNEXT.md:83-90` | El instalador debería registrar esta tarea automáticamente |
| Datos de la institución/admin inicial | Parcial | Sí, vía `seed-instalacion.ts` + `config/institucion.json` (no versionado) | El archivo de config real debe crearse a mano copiando el `.example.json` | `scripts/seed-instalacion.ts:15-18`, `config/institucion.example.json` | Buen punto de partida ya existente para el instalador — falta integrarlo al flujo automático |

---

## 14. Servicios de Windows

`[EVIDENCIA]` — distinción exacta pedida:

- **PostgreSQL instalado como servicio de Windows:** es lo esperado del instalador oficial de PostgreSQL (EDB) mencionado en la documentación (`docs/ Verdades del entorno — ALNEXT.md:74`), pero **no hay ningún archivo en el repo que instale, configure o referencie ese servicio de Windows directamente** — ni su nombre, ni su ruta, ni comandos `sc.exe`/`net start` sobre él. Es responsabilidad exclusiva del instalador oficial de Postgres, fuera del código de ALNEXT.
- **ALNEXT administrando ese servicio:** no existe. Ningún script del repo arranca, detiene, ni consulta el estado del servicio de PostgreSQL.
- **Servicio propio de ALNEXT (la app Next.js) como servicio de Windows:** no existe (ver §11).
- **PM2/NSSM:** ninguno de los dos está en uso (confirmado por ausencia en `package.json`/`package-lock.json` como dependencia propia, y por ausencia de archivos de configuración).
- **Task Scheduler:** el único uso real y documentado de un mecanismo de Windows (no exactamente un "servicio" en sentido estricto, sino una tarea programada) es el de backup (§9), y se registra manualmente siguiendo la documentación, no vía un script del repo.

---

## 15. Puertos

`[EVIDENCIA]` — puerto de la aplicación: Next.js usa el puerto **3000 por defecto** (comportamiento estándar de `next dev`/`next start` cuando no se pasa `-p`/`PORT`) — no se encontró ningún `-p <puerto>` ni variable `PORT` fijada en `package.json` ni en ningún script del repo, así que ALNEXT corre en el puerto por defecto de Next.js salvo que se le pase explícitamente al invocar `next start`/`next dev` desde fuera del repo (no hay evidencia de que eso se haga hoy). `docs/ Verdades del entorno — ALNEXT.md:96` confirma esto indirectamente: hace polling a `localhost:3000`, no a un puerto configurado.

`[EVIDENCIA]` — puerto de PostgreSQL: **5433**, en tres lugares del árbol de trabajo/repo:
1. `.env` (no versionado): `postgresql://admin:admin123@localhost:5433/gestor_horarios?schema=public`
2. `.env.test` (no versionado): `postgresql://admin:admin123@localhost:5433/gestor_test?schema=public`
3. **`package.json:16`** (sí versionado, forma parte del repositorio git): 
   ```
   "test:run": "cross-env DATABASE_URL=postgresql://admin:admin123@localhost:5433/gestor_test?schema=public vitest run --reporter=verbose"
   ```

**Respuesta directa a la nota específica del enunciado:**

- **¿Está hardcodeado en algún archivo versionado?** **Sí.** `package.json:16` es un archivo versionado en git (a diferencia de `.env`/`.env.test`, que están en `.gitignore` y no forman parte del repositorio — confirmado con `git ls-files | grep -E "^\.env"`, sin resultados, y `git check-ignore -v .env .env.test` confirmando que ambos matchean la regla `.env*` de `.gitignore:34`). El puerto **5433 está hardcodeado como literal de texto dentro de un script de `package.json`**, que sí es parte del control de versiones.
- **¿Es un valor por defecto sobreescribible por variable de entorno?** No, tal como está escrito hoy: `cross-env DATABASE_URL=postgresql://...5433...` fija el valor completo de la variable dentro del propio comando — no hay una variable de entorno externa que pueda pisar ese valor sin editar `package.json` (a menos que se invoque `vitest` directamente sin pasar por el script `npm run test:run`, evitando así el `cross-env` de ese script).
- **¿Existe algún mecanismo que detecte o valide que el puerto está libre antes de usarlo?** `[EVIDENCIA — ausencia]`: no. No se encontró en todo el repositorio (excluyendo `node_modules`) ningún código que verifique disponibilidad de un puerto antes de conectar/usarlo — ni para el puerto de la app (3000) ni para el de PostgreSQL (5433). La búsqueda fue explícita sobre los términos de puerto y sobre patrones típicos de verificación (`net.createServer`, `is-port-reachable`, `netstat`, etc.) sin resultados relevantes en código propio.

**Explicación de qué ocurre si el puerto está ocupado:** `[INFERENCIA]` — si otro proceso ya escucha en el puerto 5433 (o en el 3000 para la app), la conexión de Prisma fallará (para 5433) o `next start`/`next dev` fallará al intentar bindear el puerto (para 3000, comportamiento estándar de Next.js: error y salida, no hay lógica de reintento con otro puerto en el código de ALNEXT). No hay manejo de error específico de ALNEXT para ninguno de los dos casos.

**Riesgo explícito, tal como pide el enunciado (desarrollado también en §B):** 5433 es un valor común para una segunda instancia de PostgreSQL en máquinas donde ya existe una instalación en el puerto default (5432). Bajo la premisa de PC compartida de una escuela, es enteramente posible que otro sistema instalado previamente en esa PC ya use el puerto 5433 por el mismo motivo (evitar 5432). El hecho de que 5433 no sea el puerto por defecto de PostgreSQL **no lo vuelve un puerto "seguro"** para una instalación desatendida en una máquina desconocida — no hay evidencia en el repo de que se haya evaluado esto para el entorno de escuela real, y el propio plan de instalación en Windows nativo (`docs/ Verdades del entorno — ALNEXT.md:75`) ya cambia el criterio para la máquina de la escuela: ahí se decide usar el **5432 default** razonando que "no hay conflicto con ningún otro Postgres ahí, a diferencia de la máquina de dev" — una afirmación sin verificación programática, basada en la suposición de que la PC de la escuela no tiene otro Postgres, que es precisamente la premisa que la consigna de esta auditoría pide **no** asumir.

---

## 16. Componentes que deberían quedar encapsulados

Basado en la evidencia relevada, para una instalación autocontenida de ALNEXT bajo la versión acotada (Node embebido + PostgreSQL vía instalador oficial):

- **Runtime Node.js embebido** (binario portable ≥20.9.0, versión exacta a congelar): imprescindible — hoy no hay ninguna forma de fijar/aislar la versión de Node de la máquina destino (§3), y la premisa del piloto es justamente no depender de una instalación global que puede pertenecer a otro sistema de la escuela.
- **La aplicación (`app/`, `lib/`, `.next/` compilado, `node_modules/`)**: debe vivir en un directorio propio de ALNEXT, no en una ruta compartida — ya es la práctica implícita del plan actual (`C:\ALNEXT\gestor_clean`, `docs/ Verdades del entorno — ALNEXT.md:77`), pero conviene formalizarlo bajo una carpeta raíz propia del instalador (ver §C).
- **`node_modules` con el Prisma Client ya generado**: dado que la generación es automática vía postinstall (§8), conviene que el instalador ya la incluya empaquetada en vez de depender de conectividad a npm registry en la máquina de la escuela (riesgo de conexión a internet ausente el día de la instalación).
- **Configuración (`.env` generado por el instalador, no copiado a mano)**: debe quedar en un directorio propio de ALNEXT, con el puerto y credenciales de la instancia de Postgres que el propio instalador creó — nunca reutilizando valores de otra instalación de la PC.
- **Directorio de datos y servicio de PostgreSQL**: quedan fuera de la carpeta de ALNEXT por diseño de esta versión acotada (los gestiona el instalador oficial de Postgres en su propia ubicación, ver §C) — pero el **puerto y el nombre/identificación del servicio sí deben ser propios de ALNEXT** y quedar documentados/almacenados en la configuración de ALNEXT para que el instalador (y soporte técnico) sepan a qué instancia conectarse.
- **Backups** (`scripts/backup-alnext.ps1` + carpeta `backups/`): ya están diseñados para vivir fuera de lo que la app sirve por HTTP (comentario propio del script) — deben quedar en un directorio propio de ALNEXT, con ruta absoluta conocida por el instalador, no relativa a donde se clonó el repo a mano.
- **Logs**: `[NO DETERMINADO]` — no se encontró en el repo ningún mecanismo de logging a archivo (más allá de `console.log`, ej. `lib/prisma.ts:18` imprime `"DB USADA:"` a stdout). Si el mecanismo de arranque futuro corre la app como proceso de fondo/servicio, hace falta decidir dónde capturar esa salida — hoy no hay ninguna decisión tomada al respecto en el repo.
- **Licencia** (`proxy.ts`, control de licencia consolidado el 12/09/2026): el mecanismo actual (`Institucion.activo`/`Institucion.estado`, booleano manual, sin automatización de fechas — confirmado en `proxy.ts` y corroborado por `docs/Diseño MVP de sistema de licencias.md:3`, que marca explícitamente "Estado: NO INICIAR" para cualquier sistema de licencias más sofisticado hasta después del piloto) vive **dentro de la base de datos operativa** (tabla `Institucion`). Esto es relevante para el instalador: si en el futuro se implementa backup/restore automatizado sin cuidado, un restore de un backup viejo podría revertir el estado de licencia — el propio documento de diseño de licencias ya señala este riesgo como punto (a) a resolver antes de construir el sistema definitivo (`docs/Diseño MVP de sistema de licencias.md:37`). Para el MVP actual (booleano manual, sin este sistema todavía implementado) el riesgo es menor pero conceptualmente el mismo.
- **Archivos temporales / mecanismo de actualización**: `[NO DETERMINADO]` — no existe hoy ningún mecanismo de actualización de la aplicación ya instalada (no hay versión empaquetada, no hay changelog de instalador, no hay comando de "actualizar"). Debe diseñarse desde cero (ver §E).
- **Scripts de mantenimiento** (`resetear-password.ts`, `seed-instalacion.ts`): deben quedar accesibles post-instalación (ej. en una carpeta `scripts/` propia dentro de la instalación de ALNEXT) para que soporte técnico los invoque sin necesitar el repositorio git completo.

---

## 17. Permisos de administrador

`[EVIDENCIA]` — el repositorio **no contiene ningún chequeo de permisos de administrador** en ningún script (`.ps1` o `.ts`). Ninguno de los dos scripts PowerShell (`backup-alnext.ps1`, `restaurar-alnext.ps1`) verifica ni requiere explícitamente una sesión elevada — ambos operan sobre `pg_dump`/`psql` y el sistema de archivos del propio proyecto, operaciones que no requieren administrador en un uso normal (asumiendo que el usuario que corre el script tiene permiso de conexión a la base y de escritura en la carpeta de backups).

`[EVIDENCIA — documentación, no código]`: `docs/ Verdades del entorno — ALNEXT.md:72` es explícito sobre el contexto de usuario esperado para el *plan de instalación completo* (no solo backup/restore):

> "Windows 10/11, cuenta de usuario estándar de la escuela (administrador solo para los pasos de instalación inicial: Postgres, Node, Task Scheduler)."

Es decir, el propio plan ya asume y documenta que: (a) el uso diario de ALNEXT por parte del personal de la escuela es con cuenta estándar, sin privilegios; (b) los pasos de instalación inicial (instalar Postgres, instalar Node, registrar la tarea programada) sí requieren una sesión de administrador, al menos puntualmente.

**Adicional para la versión acotada, tal como pide la consigna:** el instalador oficial de PostgreSQL en modo silencioso, para registrar un servicio de Windows, típicamente **requiere permisos de administrador** — esto es una limitación conocida de este enfoque (delegar en el instalador oficial de terceros), no algo que esta auditoría deba resolver. El repositorio es consistente con esa limitación: ya asume administrador "para los pasos de instalación inicial", incluyendo Postgres, en la cita de arriba.

Desglose por actividad, según lo que el repo permite inferir:

| Actividad | Requiere admin (según evidencia del repo) |
|---|---|
| Instalación inicial (Postgres, Node, Task Scheduler) | Sí — explícito en la documentación citada |
| Creación de carpetas/escritura de archivos de la app | `[NO DETERMINADO]` — depende de dónde se instale; si es una ruta de usuario estándar, no debería requerir admin, pero no hay evidencia de que el instalador futuro ya haya decidido la ruta |
| Registro de servicios (Postgres vía instalador oficial) | Sí — limitación conocida del enfoque, no resuelta ni evitable en esta versión acotada |
| Apertura de puertos / firewall | `[NO DETERMINADO]` — no hay ningún script en el repo que toque reglas de firewall de Windows |
| Ejecución diaria de Node/la app | `[INFERENCIA]` — no debería requerir admin, ya que no hay ninguna operación privilegiada en el código de la aplicación en sí (solo acceso a archivos propios y a la base de datos vía red/socket local) |
| Backup/restore (`scripts/*.ps1`) | `[INFERENCIA]` no requieren admin per se, salvo que las credenciales/permisos de PostgreSQL usados exijan un rol elevado en la base (no verificable desde el repo) |
| Actualización | `[NO DETERMINADO]` — no existe hoy el mecanismo (ver §E) |
| Desinstalación | `[NO DETERMINADO]` — no existe hoy ningún desinstalador |

---

## Viabilidad del instalador oficial de PostgreSQL en modo silencioso

Esta sección evalúa la viabilidad y los riesgos de la decisión ya tomada (usar el instalador oficial de PostgreSQL en modo unattended), no alternativas.

- **¿La versión requerida (18, según §4) tiene instalador oficial standalone para Windows?** `[INFERENCIA — basada en documentación externa de PostgreSQL/EDB, no en el repo]`: sí. El proyecto EDB ("EnterpriseDB", el mismo mencionado en `docs/ Verdades del entorno — ALNEXT.md:74` como fuente del instalador usado en la validación real) distribuye instaladores gráficos standalone para Windows x64 para las versiones mayores soportadas de PostgreSQL, incluida la 18, descargables sin gestor de paquetes. Esto no se verifica desde el repo (no hay ningún artefacto de ese instalador dentro del repositorio), se basa en conocimiento externo de cómo EDB distribuye PostgreSQL para Windows.
- **Parámetros de línea de comandos del instalador oficial para modo silencioso** `[INFERENCIA — basada en documentación externa de PostgreSQL, no en el repo]`: el instalador de EDB para Windows (basado en BitRock/PostgreSQL Installer) soporta modo desatendido vía flags como `--mode unattended`, y parámetros como `--unattendedmodeui minimal`, `--superpassword`, `--serverport`, `--datadir`, `--servicename`, `--serviceaccount`, `--servicepassword`, y `--locale`. El repositorio no documenta ni usa ninguno de estos flags — no hay ningún script en el repo que invoque el instalador de Postgres de ningún modo, silencioso o no. Esta parte del hallazgo es enteramente externa al repo y debe verificarse contra la documentación oficial vigente de PostgreSQL/EDB al momento de implementar, no asumirse como definitiva a partir de este informe.
- **¿Qué pasa si ya hay un servicio de Postgres corriendo en el puerto que ALNEXT intenta usar?** `[NO DETERMINADO]` desde el repo (no hay evidencia de que esto se haya probado); `[INFERENCIA — basada en comportamiento típico documentado de instaladores de servicios de Windows]`: es esperable que el instalador de Postgres falle al intentar que el nuevo servicio escuche en un puerto ya ocupado (el binding del socket fallaría al arrancar el servicio, no necesariamente durante la instalación en sí, que podría completarse "aparentemente bien" y solo fallar al iniciar el servicio). Esto refuerza la necesidad del paso de detección de puerto libre *antes* de invocar el instalador (ver §D, paso 4), no delegarlo en la detección de errores del instalador de terceros.
- **¿Cómo se identificaría, para soporte técnico, qué servicio de Postgres pertenece a ALNEXT?** `[NO DETERMINADO]` desde el repo — no existe hoy ninguna convención de nombre de servicio, descripción o ruta de instalación documentada para este propósito. Si el instalador oficial permite parametrizar `--servicename` (ver punto anterior, no verificado en el repo), sería el mecanismo natural, pero no hay decisión tomada ni documentada en el repositorio.
- **Desinstalación dirigida solo a la instancia de ALNEXT:** `[NO DETERMINADO]` — no hay evidencia en el repo de cómo se plantea la desinstalación bajo este esquema. Es una pregunta abierta que depende de cómo el instalador oficial de Postgres registra su propio desinstalador (típicamente un `uninstall.exe` en el directorio de instalación de esa instancia específica, según el patrón general de instaladores de EDB) — no verificado contra el repo, que no tiene ninguna referencia a este flujo.
- **Actualización de versión mayor de PostgreSQL bajo este esquema:** `[NO DETERMINADO]` desde el repo — no hay ningún mecanismo ni documentación sobre esto. Ver propuesta conceptual en §E.
- **Riesgos conocidos de depender del instalador de terceros:** disponibilidad de descarga (si se descarga en tiempo de instalación, requiere conexión a internet en la PC de la escuela, que puede no estar garantizada — no hay evidencia en el repo de que se haya decidido offline vs. online), tamaño del paquete (los instaladores de EDB para Windows suelen pesar varios cientos de MB, relevante si se empaqueta offline dentro del instalador de ALNEXT), firma digital (relevante para que Windows SmartScreen/antivirus no bloqueen la ejecución silenciosa), compatibilidad con antivirus corporativo/escolar (un instalador desatendido que registra un servicio y abre un puerto puede ser señalado por soluciones de seguridad de la escuela — no hay evidencia en el repo de que esto se haya evaluado).

**Recomendación concreta pedida por la consigna** (con base en la evidencia relevada, no una decisión a implementar):

1. **Empaquetar el instalador oficial de PostgreSQL 18 para Windows x64 (EDB)** — es la única versión con evidencia real de uso en el proyecto (§4); no se encontró en el repo justificación para una versión distinta.
2. **Incluirlo offline dentro del paquete de ALNEXT**, no descargarlo en tiempo de instalación — dado el contexto de PCs de escuela con conectividad potencialmente no garantizada el día de la instalación (esto es una recomendación razonada a partir del contexto del piloto descrito en `docs/plan-pre-post-piloto-alnext-2026-09-10.md`, no una confirmación de que el repo ya lo decidió; el repo no tiene evidencia de conectividad esperada en las escuelas).
3. **Riesgos a documentar como deuda técnica aceptada para el piloto** (a resolver en una versión futura con PostgreSQL 100% portable, si el piloto se valida): (a) identificación del servicio de Postgres de ALNEXT frente a soporte técnico, sin convención definida hoy; (b) desinstalación no verificada; (c) actualización de versión mayor de Postgres sin mecanismo definido; (d) puerto hardcodeado en `package.json` (§15) que debe corregirse antes de considerar esto resuelto, independientemente del enfoque de instalador de Postgres elegido; (e) tamaño/firma/antivirus del instalador de terceros embebido, no evaluados en el repo.

---

## A. Estado actual

Resumen consolidado de lo relevado en §1-17:

- **Arquitectura de ejecución:** Next.js 16.1.6 monolítico (UI + API), sin servidor externo ni gestor de procesos, arranque 100% manual.
- **Dependencia de Node:** total y no aislada — ninguna versión fijada por el propio proyecto (`engines`/`.nvmrc` ausentes), restricción real solo heredada de la versión exacta de Next.js instalada (`>=20.9.0`).
- **Dependencia de PostgreSQL:** total y externa — nada en el repo instala, verifica, ni administra PostgreSQL; todo pasa por una única `DATABASE_URL`.
- **Configuración:** vive en `.env`/`.env.test`, no versionados (buena práctica ya presente); un puerto (5433) sí quedó hardcodeado en un archivo versionado (`package.json`).
- **Migraciones/Prisma Client:** migraciones manuales (`prisma migrate deploy`, documentado, no automatizado como paso de instalación); Prisma Client se autogenera vía `postinstall` del paquete `@prisma/client` en cada `npm install`.
- **Backup/Restore:** mecanismo propio real, funcional, validado en la práctica (`backup-alnext.ps1` / `restaurar-alnext.ps1`), registrado manualmente como tarea de Windows.
- **Arranque/detención/instalación:** sin mecanismo formal; documentación de instalación manual detallada, pero ningún instalador real.
- **Servicios de Windows:** ninguno propio de ALNEXT hoy; PostgreSQL se instalaría como servicio vía su instalador oficial, sin integración actual con el repo.
- **Puertos:** app en 3000 (default de Next, no configurado), Postgres en 5433 (hardcodeado en un archivo versionado para el entorno de test).
- **Permisos:** documentado (no en código) que la instalación inicial requiere administrador y el uso diario, cuenta estándar.

Todo lo anterior depende hoy de componentes instalados y administrados **fuera** de ALNEXT: el runtime de Node de la máquina y la instancia de PostgreSQL de la máquina.

---

## B. Riesgos

**Riesgo: Node incompatible o ausente en la PC de la escuela**
Causa raíz: no hay runtime propio ni versión fijada por el proyecto; se depende de lo que esté (o no) instalado globalmente.
Evidencia: ausencia de `engines`/`.nvmrc` (§3); `node_modules/next/package.json` exige `>=20.9.0`.
Impacto potencial: la app no arranca, o arranca con una versión no probada con comportamiento no garantizado.
Probabilidad/condición: alta si se instala en una PC de escuela sin control previo del entorno — exactamente el escenario que motiva esta auditoría.
Mitigación futura propuesta: runtime Node embebido con versión exacta congelada ≥20.9.0 (decisión ya tomada; falta solo fijar el número de versión exacto).
Estado: EVIDENCIA (para la causa) / INFERENCIA (para el impacto exacto).

**Riesgo: versión de PostgreSQL requerida vs. disponible en el instalador oficial**
Causa raíz: la versión "requerida" (18) es de facto, no está fijada por Prisma/schema, solo por convención operativa (rutas hardcodeadas en scripts).
Evidencia: `scripts/backup-alnext.ps1:50`, `scripts/restaurar-alnext.ps1:68` (rutas a la v18); ausencia de versión en `schema.prisma`.
Impacto potencial: si el instalador empaqueta una versión distinta a 18, los fallbacks de backup/restore fallarían al no encontrar `pg_dump`/`psql` en la ruta esperada (aunque seguirían funcionando si esos binarios están en el PATH).
Probabilidad/condición: baja si se respeta 18 como se documentó y validó; alta si se sustituye por otra versión sin ajustar los scripts.
Mitigación futura propuesta: parametrizar la ruta de los binarios de Postgres en los scripts en vez de hardcodearla a una versión, o mantener 18 como versión fija documentada del instalador.
Estado: EVIDENCIA.

**Riesgo: puerto 5433 hardcodeado en un archivo versionado, sin garantía de estar libre en la PC destino**
Causa raíz: `package.json:16` fija el puerto de forma literal dentro del comando `test:run`; no hay detección de puerto libre en ningún lugar del repo.
Evidencia: cita textual en §15; ausencia total de lógica de verificación de puertos en el repositorio.
Impacto potencial: en una PC de escuela con otro sistema ya usando 5433 (valor común para una segunda instancia de Postgres, como explica la propia consigna de esta auditoría), la instalación de ALNEXT podría fallar al arrancar su instancia de Postgres, o peor, interferir con la instancia ya existente si el instalador oficial no detecta el conflicto de forma clara.
Probabilidad/condición: depende enteramente del entorno de cada escuela — no cuantificable desde el repo, pero la propia premisa de la auditoría (PC compartida) la vuelve una condición realista, no un caso de borde.
Mitigación futura propuesta: reemplazar el valor hardcodeado por detección dinámica de puerto libre en el futuro instalador (ya indicado como prioridad en la consigna); mientras tanto, al menos parametrizar `test:run` para no hardcodear el puerto en un archivo versionado.
Estado: EVIDENCIA.

**Riesgo: PATH global — el runtime embebido debe evitar depender de o modificar el PATH del sistema**
Causa raíz: hoy `next`/`node`/`npm` se invocan asumiendo que están en el PATH (vía `npm run <script>`, que resuelve binarios locales de `node_modules/.bin` sin depender del PATH global para eso en particular, pero si se invoca `node`/`npm` directamente desde un futuro instalador, sí dependería del PATH salvo que se usen rutas absolutas al runtime embebido).
Evidencia: ningún script del repo asume rutas absolutas a Node — todos usan `node`/`npm`/`npx` "desnudos", que resuelven vía PATH cuando se invocan fuera de un contexto de `npm run`.
Impacto potencial: si el instalador no invoca el runtime embebido con rutas absolutas, podría terminar ejecutando por accidente una instalación de Node distinta ya presente en el PATH de la PC de la escuela — justo el escenario que la premisa del piloto busca evitar.
Probabilidad/condición: depende de cómo se implemente el instalador; es un riesgo de diseño, no un bug actual.
Mitigación futura propuesta: el instalador y cualquier tarea programada/servicio deben invocar siempre el runtime embebido por ruta absoluta, nunca depender de que `node`/`npm` resuelvan al binario correcto vía PATH.
Estado: INFERENCIA (riesgo de diseño futuro, no un hecho ya ocurrido en el repo actual).

**Riesgo: permisos de administrador para registrar el servicio de PostgreSQL**
Causa raíz: limitación inherente al enfoque ya decidido (instalador oficial de terceros en modo silencioso).
Evidencia: no hay evidencia en el repo de cómo se resolvería una instalación sin privilegios de administrador disponibles; la documentación (`docs/ Verdades del entorno — ALNEXT.md:72`) asume administrador disponible "para los pasos de instalación inicial".
Impacto potencial: instalación bloqueada si quien la ejecuta no tiene credenciales de administrador de esa PC (relevante en escuelas donde el personal de secretaría/docente no necesariamente tiene ese acceso).
Probabilidad/condición: depende del contexto real de cada escuela — no determinable desde el repo.
Mitigación futura propuesta: ninguna dentro del alcance de esta versión acotada (aceptada como limitación conocida, según la consigna); documentar como requisito previo de instalación (necesitar a alguien con acceso de administrador presente el día de la instalación).
Estado: NO DETERMINADO (para la probabilidad real en las escuelas piloto) / EVIDENCIA (para la existencia de la limitación en sí, que es inherente al enfoque, no específica de este repo).

**Riesgo: credenciales/datos — patrón de credenciales débil replicado en instalaciones reales**
Causa raíz: `.env`/`.env.test` de desarrollo usan `admin`/`admin123`; `seed-instalacion.ts` exige una contraseña temporal de al menos 8 caracteres para el admin de la institución, pero no exige complejidad más allá de eso.
Evidencia: `.env`, `.env.test`, `scripts/seed-instalacion.ts:82-84` (única validación: longitud ≥8).
Impacto potencial: si el instalador real reutiliza patrones de contraseña simples para el rol de PostgreSQL de cada escuela, aumenta el riesgo de acceso no autorizado a la base de datos de una institución real.
Probabilidad/condición: depende de qué credenciales genere el futuro instalador — no determinable desde el repo actual, que solo expone las de desarrollo.
Mitigación futura propuesta: generar credenciales aleatorias fuertes por instalación, nunca reutilizar `admin`/`admin123` fuera de desarrollo.
Estado: EVIDENCIA (para el patrón de desarrollo) / NO DETERMINADO (para lo que hará el instalador futuro).

**Riesgo: backups y estado de licencia — restore revirtiendo estado comercial**
Causa raíz: el estado de licencia (`Institucion.activo`/`estado`) vive en la misma base de datos operativa que respalda/restaura `backup-alnext.ps1`/`restaurar-alnext.ps1`.
Evidencia: `proxy.ts` (lectura de `tenant.activo`/`tenant.estado` desde la misma base vía `resolveTenant`), scripts de backup/restore que operan sobre la base completa sin excluir tablas; `docs/Diseño MVP de sistema de licencias.md:37` ya identifica esta misma tensión como punto (a) a resolver antes de construir el sistema de licencias definitivo.
Impacto potencial: restaurar un backup viejo de una institución que fue suspendida después de ese backup la dejaría activa nuevamente hasta la próxima verificación (hoy no hay verificación periódica automática — el control es manual, según `docs/punto-de-partida-sesion-de-cierre-2026-09-12.md`).
Probabilidad/condición: se dispara únicamente si se restaura un backup anterior al cambio de estado de licencia — operación explícitamente rara y manual (confirmación obligatoria en `restaurar-alnext.ps1`), pero posible.
Mitigación futura propuesta: la ya señalada en el propio documento de diseño de licencias — mantener el estado de licencia fuera de lo que el backup/restore toca. Fuera del alcance de esta auditoría implementarlo.
Estado: EVIDENCIA (para el mecanismo actual y la tensión identificada) / INFERENCIA (para la probabilidad real de que ocurra en el piloto, dado que el control es manual y de bajo volumen).

**Riesgo: instalación interrumpida dejando el sistema en estado inconsistente**
Causa raíz: no existe hoy ningún instalador real (§12), por lo tanto tampoco existe ningún mecanismo de rollback/recuperación ante fallo a mitad de instalación.
Evidencia: ausencia total de código relacionado en el repo.
Impacto potencial: una instalación fallida a mitad de camino (ej. Postgres instalado pero migraciones no corridas, o `.env` mal generado) dejaría la PC de la escuela en un estado que requeriría intervención manual experta para diagnosticar.
Probabilidad/condición: depende enteramente de cómo se implemente el futuro instalador — hoy la probabilidad es alta porque no existe ningún instalador automatizado que pueda "interrumpirse a mitad de camino": todo se hace paso a paso, a mano, por lo que un fallo se detecta en el paso mismo donde ocurre.
Mitigación futura propuesta: ver §D (validación por paso, sin continuar si un paso previo falló).
Estado: EVIDENCIA (para la ausencia de mecanismo) / NO DETERMINADO (para el comportamiento real de un instalador que todavía no existe).

**Riesgo: desinstalación / actualización de versión mayor de PostgreSQL sin mecanismo definido**
Causa raíz: fuera del alcance de lo ya resuelto en el repo; depende de capacidades del instalador oficial de Postgres no verificadas contra el repo.
Evidencia: ausencia total de código relacionado.
Impacto potencial: una actualización mal ejecutada podría dejar datos huérfanos, dos instancias de Postgres compitiendo por recursos, o servicios mal identificados.
Probabilidad/condición: se materializa solo si en el futuro se decide actualizar la versión mayor de PostgreSQL de una instalación ya en producción en una escuela.
Mitigación futura propuesta: ver §E.
Estado: NO DETERMINADO.

---

## C. Arquitectura recomendada (versión acotada)

```text
ALNEXT/
├── runtime/
│   └── node/                  # Node.js embebido, versión exacta congelada (≥20.9.0)
├── app/                       # Código de la aplicación (equivalente a este repo: app/, lib/, prisma/, node_modules/, .next/)
├── postgres-installer/        # Instalador oficial de PostgreSQL 18 (Windows x64), si se decide empaquetarlo offline (ver recomendación de la sección de viabilidad)
├── config/
│   ├── .env                   # Generado por el instalador, apuntando a la instancia propia de Postgres
│   └── institucion.json       # Igual criterio que hoy (config/institucion.example.json → institucion.json, no versionado)
├── backups/                   # Igual criterio que hoy (scripts/backup-alnext.ps1), ruta absoluta y propia
├── logs/                      # No existe hoy (§16) — a definir junto con el mecanismo de arranque/servicio
└── scripts/
    ├── backup-alnext.ps1
    ├── restaurar-alnext.ps1
    ├── seed-instalacion.ts
    └── resetear-password.ts
```

El **directorio de datos y el servicio de PostgreSQL en sí** quedan **fuera** de esta estructura, en la ubicación que determine el instalador oficial de PostgreSQL — típicamente, para el instalador de EDB en Windows, algo como `C:\Program Files\PostgreSQL\<versión>\data` para el directorio de datos por defecto (documentar la ubicación real exacta una vez se pruebe el instalador silencioso con los parámetros de directorio propios de ALNEXT, ya que puede parametrizarse — `[INFERENCIA — basada en documentación externa de PostgreSQL, no verificada contra una ejecución real]`).

Justificación de los cambios respecto a la estructura orientativa de la consigna: se agregó `logs/` explícitamente vacío de contenido real hoy, para dejar registrado que es un componente pendiente de diseño (§16), no simplemente omitirlo. El resto de la estructura sigue el patrón ya usado por el propio proyecto (scripts en `scripts/`, config sensible fuera de `git`, backups en carpeta propia).

Componentes que la arquitectura debe contemplar, y su estado actual real:
- **Node.js propio:** a resolver — decisión ya tomada, versión exacta a fijar (§3).
- **Invocación del instalador oficial de PostgreSQL con parámetros propios:** a resolver — no existe hoy ningún código que lo haga (§ viabilidad).
- **Configuración aislada:** ya hay una base (`.env`, `config/institucion.json`, ambos ya diseñados para no versionarse) — falta que un instalador los genere en vez de requerir copiarlos a mano.
- **Backups aislados:** ya resuelto conceptualmente (`backups/` fuera de lo servido por HTTP) — falta integrarlo a un instalador que registre la tarea programada automáticamente.
- **Logs:** sin resolver (§16).
- **Licencia:** mecanismo manual ya consolidado en `proxy.ts` (12/09/2026); el sistema de licencias automatizado está explícitamente pausado hasta después del piloto (`docs/Diseño MVP de sistema de licencias.md:3`) — no forma parte del alcance de esta auditoría de instalador.
- **Actualización, recuperación, arranque, detención, desinstalación:** sin resolver, ver §D/§E.

---

## D. Instalador

Paso a paso conceptual, sin implementar, con foco en fallos:

1. **Validaciones iniciales:** verificar si el proceso corre elevado (necesario para registrar el servicio de Postgres, §17); si hace falta descarga en línea del instalador de Postgres (según se resuelva en la sección de viabilidad), verificar conectividad antes de avanzar.
   - Fallo — sin admin: detectar con una verificación de privilegios al inicio del instalador (no ejecutar ninguna acción destructiva antes de esa verificación); mostrar mensaje claro pidiendo re-ejecutar como administrador; no debería intentar continuar con privilegios insuficientes y fallar a mitad de camino.
2. **Selección/preparación de directorios propios de ALNEXT:** crear la estructura de §C en una ruta elegida (con un default razonable, ej. `C:\ALNEXT`).
   - Fallo — falta de espacio: verificar espacio disponible antes de copiar el runtime/la app (el tamaño combinado de Node embebido + `node_modules` + el instalador de Postgres si se empaqueta offline puede ser considerable); si falla, no dejar una carpeta a medio copiar — limpiar lo creado en este paso si se aborta.
3. **Despliegue del runtime Node embebido:** copiar el runtime portable a `runtime/node/`.
   - Bajo riesgo relativo (es una copia de archivos, no hay estado del sistema operativo involucrado); reversible con solo borrar la carpeta.
4. **Detección de puerto libre para PostgreSQL propio:** no asumir 5433 libre (§15) — verificar activamente si el puerto candidato está en uso antes de invocar el instalador de Postgres, probando puertos alternativos si hace falta.
   - Fallo — puerto ocupado: detectarlo *antes* de invocar el instalador de Postgres (no depender de que el instalador de terceros lo detecte y falle de forma clara, ver riesgo señalado en la sección de viabilidad); si todos los puertos candidatos de un rango razonable están ocupados, abortar con mensaje explícito en vez de forzar un puerto.
5. **Invocación del instalador oficial de PostgreSQL en modo silencioso**, con puerto y directorio de datos propios (parámetros a confirmar contra la documentación oficial vigente al momento de implementar, ver sección de viabilidad).
   - Fallo — falta de permisos de administrador para este paso específico: debería fallar de forma clara y detenerse aquí, sin haber tocado todavía la base de datos ni la configuración de ALNEXT — nada debería asumirse instalado hasta confirmar el próximo paso (verificación de arranque del servicio).
   - Fallo — instalación de Postgres falla o queda a medias: no continuar con los pasos siguientes (creación de usuario, migraciones); reportar el error del instalador de Postgres tal cual, sin enmascararlo.
6. **Verificación de que el servicio de PostgreSQL de ALNEXT arrancó correctamente:** intentar una conexión real (no solo verificar que el servicio de Windows figура "iniciado" — un servicio puede estar "iniciado" y el motor no estar aceptando conexiones todavía, o haber fallado al bindear el puerto).
   - Fallo — Postgres no inicia: no avanzar a la creación de usuario/base ni a las migraciones; ofrecer reintentar la verificación (el arranque del servicio puede tardar) antes de declarar fallo definitivo.
7. **Configuración de usuario/base de datos propios de ALNEXT** (vía `psql` o script) — análogo a lo que hoy falta automatizar (ver tabla de §13, fila "Usuario/rol de PostgreSQL").
   - Fallo — no se puede crear el rol/base (permisos insuficientes del superusuario recién configurado, por ejemplo): detener antes de generar el `.env`, para no dejar una app configurada apuntando a credenciales que no funcionan.
8. **Generación del `.env`** con `DATABASE_URL` apuntando a la instancia propia — reemplaza el "copiar `.env` a mano" documentado hoy (`docs/ Verdades del entorno — ALNEXT.md:78`).
   - Fallo — archivo de configuración inválido (ej. datos faltantes de `config/institucion.json`, mismo criterio de validación que ya implementa `scripts/seed-instalacion.ts:75-90`): reutilizar esa misma validación ya existente en el instalador, no reinventarla.
9. **Generación de Prisma Client:** dado que ya ocurre automáticamente vía `postinstall` de `@prisma/client` al correr `npm install` (§8), este paso puede ser implícito si el instalador ejecuta `npm install` con el Node embebido — pero si el paquete se distribuye con `node_modules` ya incluido (recomendado para evitar depender de conectividad a npm registry el día de la instalación), debe verificarse explícitamente que el cliente generado coincide con el `schema.prisma` empaquetado.
10. **Ejecución de migraciones** (`prisma migrate deploy`, mismo comando ya usado hoy manualmente, §7).
    - Fallo — migración fallida: **no** intentar "arreglar" el estado de la base automáticamente; detener el instalador, dejar la base como quedó (Prisma registra el estado de las migraciones aplicadas, así que un reintento posterior desde el mismo punto es seguro si se corrige la causa del fallo) y reportar el error real de Prisma sin resumir/ocultar el detalle.
11. **Configuración de licencia:** con el mecanismo actual (booleano manual en la tabla `Institucion`), este paso puede reducirse a dejar la institución creada como `ACTIVO`/`activo: true` (que ya es el default del schema, `prisma/schema.prisma:124-125`) — no hay nada más que "configurar" hoy, dado que el sistema de licencias automatizado está pausado.
12. **Creación del acceso directo/mecanismo de arranque de la app:** sin resolver hoy (§11) — debe decidirse antes de este paso del instalador (servicio de Windows propio, tarea programada, o acceso directo que lance un script que arranque `next start` con el runtime embebido y rutas absolutas, ver riesgo de PATH en §B).
13. **Validación final** (la app responde en su puerto): análogo al patrón de polling ya usado hoy para tests (`docs/ Verdades del entorno — ALNEXT.md:96`, `Invoke-WebRequest` a `localhost:3000`) — reutilizar el mismo criterio para el instalador.
14. **Rollback o recuperación ante fallo en cualquier paso anterior:** dado que hoy no existe ningún mecanismo de este tipo (§B, riesgo de instalación interrumpida), el diseño mínimo razonable es: cada paso debe ser idempotente o fácilmente reversible por sí solo (crear carpeta → borrar carpeta; instalar Postgres → desinstalarlo si el paso 6 nunca confirma arranque; generar `.env` → no generarlo hasta que el paso anterior haya sido confirmado exitoso), en vez de un mecanismo de rollback transaccional complejo, que excede el esfuerzo razonable para un piloto de una sola escuela a la vez.

**Qué NO debería hacer el instalador, en cualquiera de los fallos anteriores:** continuar a un paso siguiente sin haber confirmado el éxito del paso anterior; modificar PATH global, variables de entorno globales o servicios/instalaciones de PostgreSQL/Node ya existentes en la PC (todos ellos, requisitos explícitos y no negociables de la consigna); ni intentar "adivinar" o reutilizar un puerto/instancia ya existente para evitar el paso de instalación de Postgres.

---

## E. Actualizaciones

Sin implementar — propuesta conceptual únicamente:

- **Actualización de la aplicación:** dado que hoy no existe versión empaquetada ni changelog de instalador, el primer paso conceptual (no técnico) es decidir un esquema de versionado del paquete de instalación en sí, distinto del `version: "0.1.0"` interno de `package.json` (que ni siquiera refleja el nombre real del proyecto, ver nota de §1).
- **Actualización de Node embebido:** de menor urgencia y menor riesgo relativo (reemplazar el binario portable, siempre que la nueva versión siga satisfaciendo `>=20.9.0` u otro piso que imponga la versión de Next.js vigente en ese momento) — no requiere backup previo de datos, solo de la propia carpeta `runtime/`.
- **Actualización de dependencias/migraciones Prisma:** correr `prisma migrate deploy` de la nueva versión del código sobre la base ya existente — mismo comando ya usado hoy (§7), reutilizable sin cambios en una futura actualización. Requiere backup previo (usando el mecanismo ya existente, `backup-alnext.ps1`) antes de aplicar migraciones nuevas, por si una migración necesita rollback manual (Prisma no tiene rollback automático de migraciones aplicadas en producción).
- **Rollback:** dado que Prisma no reversa migraciones aplicadas automáticamente, el mecanismo de rollback real disponible hoy es el ya existente: restaurar el backup tomado antes de actualizar (`restaurar-alnext.ps1`), no una migración "hacia atrás".
- **Configuración/licencia/datos existentes:** no deberían tocarse en una actualización de aplicación — el `.env` y el estado de la tabla `Institucion` deben preservarse intactos; el instalador de actualización no debería regenerar `.env` a menos que haya cambios legítimos.
- **Cambio de versión mayor de PostgreSQL bajo este esquema:** dado que se decidió no tener Postgres portable, la opción conceptualmente más simple y consistente con el resto del enfoque es: instalar la nueva versión mayor de Postgres en paralelo (otra instancia, otro puerto, otro directorio de datos — vía el mismo instalador oficial), migrar los datos con `pg_dump`/`psql` (mismo patrón ya usado por `backup-alnext.ps1`/`restaurar-alnext.ps1`, en formato plano, sin depender de `pg_restore`), y solo después de confirmar la migración exitosa, actualizar el `DATABASE_URL` de ALNEXT al nuevo puerto/instancia y desinstalar la instancia vieja. Esto evita ejecutar un upgrade in-place riesgoso sobre la única copia de los datos de la escuela. `[INFERENCIA]`: no hay evidencia en el repo de que esto se haya diseñado o probado — es una propuesta razonada a partir de las herramientas y patrones ya existentes en el proyecto (dump/restore en texto plano), no una confirmación de viabilidad total (el `pg_dump`/`psql` de una versión determinada pueden tener restricciones de compatibilidad con versiones muy distantes, a verificar contra la documentación oficial de PostgreSQL al momento de implementar).

---

## F. Backup / Restore

Diseño conceptual, sin implementar, sobre la base de lo ya construido y validado (`backup-alnext.ps1`/`restaurar-alnext.ps1`):

- **Formato:** mantener SQL plano (`pg_dump --format=plain`), tal como está hoy — decisión ya tomada y justificada en el propio script (permite restaurar con `psql` sin depender de `pg_restore`, línea 66).
- **Ubicación:** carpeta `backups/` propia de la instalación de ALNEXT (ya el criterio actual), con ruta absoluta conocida por el instalador — no relativa a un `git clone` manual como hoy.
- **Nombre de archivos:** mantener el patrón ya usado, `alnext_backup_<timestamp>.sql` (`backup-alnext.ps1:64`) — ya es suficientemente descriptivo y ordenable cronológicamente.
- **Frecuencia:** mantener el esquema ya validado (al iniciar sesión + cada 4 horas mientras la PC está encendida, vía Windows Task Scheduler) — ya probado en la práctica según la documentación de sesión (`docs/plan-pre-post-piloto-alnext-2026-09-10.md:18`).
- **Backup manual:** ya soportado (correr el mismo script a mano) — sin cambios necesarios.
- **Integridad:** `[NO DETERMINADO]` — no se encontró en el repo ninguna verificación de integridad del archivo de backup generado (ej. checksum, o un intento de parseo/validación post-`pg_dump`). Punto a agregar en una versión futura, fuera del alcance de "no implementar" de esta auditoría.
- **Retención:** ya implementada (últimos N backups, default 14, `backup-alnext.ps1:24,77-83`) — mantener el mismo criterio.
- **Restauración completa:** ya implementada y validada (`restaurar-alnext.ps1`) — mecanismo destructivo con confirmación explícita, adecuado para el volumen y criticidad de un piloto de una sola escuela.
- **Restauración ante actualización:** ver §E — usar el backup pre-actualización como mecanismo de rollback.
- **Restauración ante corrupción:** mismo mecanismo (`restaurar-alnext.ps1` contra el backup más reciente íntegro) — sin cambios conceptuales necesarios, dado que ya es un procedimiento genérico de "reemplazar la base actual por un backup conocido".
- **Restauración ante fallo de instalación:** distinto caso — no hay datos previos que restaurar en una instalación nueva fallida; el mecanismo relevante ahí es el de rollback del propio instalador (§D, paso 14), no el de restore de backup.
- **Licencia/configuración frente a backup/restore:** como se señaló en §16/§B, el estado de licencia vive hoy en la misma base que se respalda/restaura — esto es aceptable para el MVP actual (control manual, bajo volumen, sin sistema de licencias automatizado todavía implementado según `docs/Diseño MVP de sistema de licencias.md`), pero debe quedar documentado como una limitación conocida a resolver si se retoma el sistema de licencias automatizado post-piloto (el propio documento de diseño ya lo anticipa).

---

## G. Plan de implementación

Pasos ordenados por prioridad, según lo pedido por la consigna: primero Node embebido, luego invocación silenciosa de PostgreSQL con puerto/directorio propios (incluida la corrección del puerto 5433 hardcodeado), y al final backup/restore y estrategia de actualización de versión mayor.

### Paso 1 — Fijar versión exacta de Node y empaquetar el runtime embebido
- **Objetivo:** eliminar la dependencia de una versión de Node instalada globalmente en la PC de la escuela.
- **Alcance:** incluye fijar la versión exacta de Node (≥20.9.0, según §3) en algún mecanismo del proyecto (`engines` en `package.json` y/o `.nvmrc`) y empaquetar un binario portable de esa versión. Queda **fuera** de este paso: cualquier cambio a cómo se invoca `next`/`npm` desde scripts existentes (eso es el paso 2).
- **Cambio concreto propuesto (futuro, no implementado ahora):** agregar `"engines": {"node": ">=20.9.0"}` a `package.json` (o una versión exacta más estricta, a decidir); incorporar el binario portable de Node al paquete del instalador.
- **Dependencias:** ninguna — es el punto de partida.
- **Criterio de verificación:** `npm install` y `npm run build`/`npm run start` corren exitosamente usando exclusivamente el Node embebido, con el PATH del sistema deliberadamente sin ninguna otra instalación de Node (prueba en una máquina limpia o VM).
- **Riesgo si se omite u ordena distinto:** cualquier paso posterior (migraciones, seed, arranque) podría ejecutarse con una versión de Node incorrecta si se resuelve primero Postgres — por eso va primero.
- **Reversibilidad:** alta — es solo agregar un archivo de versión y copiar un binario; no toca datos ni estado del sistema.
- **Estimación relativa de esfuerzo:** bajo (tal como indica la consigna, es el paso de menor esfuerzo relativo del plan).

### Paso 2 — Corregir el puerto 5433 hardcodeado en `package.json`
- **Objetivo:** eliminar el riesgo señalado en §15/§B de que un valor de puerto fijo y versionado colisione con otra instalación de Postgres en la PC de la escuela.
- **Alcance:** incluye únicamente el script `test:run` de `package.json` (hoy el único lugar versionado con el puerto hardcodeado). Queda **fuera** de este paso: construir el mecanismo de detección dinámica de puerto para el instalador real (eso es parte del paso 3) — este paso es la corrección puntual del hardcodeo ya identificado, no el diseño completo de detección de puertos.
- **Cambio concreto propuesto (futuro, no implementado ahora):** parametrizar `test:run` para leer `DATABASE_URL` de una variable de entorno o de `.env.test` en vez de tener el valor completo embebido en el comando de `package.json`.
- **Dependencias:** ninguna técnica; conceptualmente se agrupa temprano en el plan porque la consigna lo prioriza explícitamente.
- **Criterio de verificación:** `grep` sobre el repositorio ya no encuentra el puerto 5433 (ni ningún otro puerto) como literal dentro de un archivo versionado en git.
- **Riesgo si se omite:** persiste el riesgo ya documentado en §15/§B tal cual está hoy.
- **Reversibilidad:** alta — cambio de una línea, sin impacto en datos.
- **Estimación relativa de esfuerzo:** bajo.

### Paso 3 — Invocación silenciosa del instalador oficial de PostgreSQL con puerto y directorio propios
- **Objetivo:** obtener una instancia de PostgreSQL aislada (puerto propio, directorio de datos propio, servicio identificable) sin depender de ni afectar otra instalación de Postgres de la PC.
- **Alcance:** incluye la detección de puerto libre (§D paso 4), la invocación del instalador oficial en modo silencioso (§D paso 5) y la verificación de arranque (§D paso 6). Queda **fuera** de este paso: la creación de usuario/base de datos de ALNEXT dentro de esa instancia (paso 4 de este plan) y la generación del `.env` (también paso 4).
- **Cambio concreto propuesto (futuro, no implementado ahora):** script/módulo del instalador que (a) detecte un puerto libre en un rango candidato, (b) invoque el instalador oficial de PostgreSQL con los parámetros correspondientes de puerto/directorio/nombre de servicio (a confirmar contra la documentación oficial vigente, ver sección de viabilidad), (c) verifique con una conexión real que el servicio quedó operativo.
- **Dependencias:** paso 1 (necesita el runtime Node embebido operativo para el resto del instalador, aunque este paso en sí no ejecuta Node) — en la práctica puede desarrollarse en paralelo al paso 1, pero debe completarse antes de los pasos 4 en adelante.
- **Criterio de verificación:** en una PC con otra instancia de Postgres ya corriendo en el puerto por defecto (5432) y también en 5433, el instalador detecta ambos ocupados, elige un tercer puerto libre, y la nueva instancia de ALNEXT queda operativa en ese puerto sin afectar a las otras dos.
- **Riesgo si se omite o se hace fuera de orden:** es el riesgo central identificado en toda la auditoría (§15, §B) — omitirlo deja vigente la posibilidad de colisión de puertos/instancias en una PC compartida, exactamente lo que la premisa no negociable de este piloto busca evitar.
- **Reversibilidad:** media — desinstalar una instancia de Postgres recién creada es más invasivo que borrar archivos, pero acotado (no toca otras instalaciones si el puerto/directorio/servicio quedaron bien aislados).
- **Estimación relativa de esfuerzo:** alto (depende de comportamiento de un instalador de terceros no verificado contra el repo, con varias preguntas marcadas `[NO DETERMINADO]`/`[INFERENCIA]` en la sección de viabilidad que requieren pruebas reales antes de poder implementarse con confianza).

### Paso 4 — Automatizar configuración de usuario/base, generación de `.env`, migraciones y seed
- **Objetivo:** reemplazar los pasos hoy manuales (copiar `.env` a mano, correr `prisma migrate deploy` y `npm run seed`/`seed-instalacion.ts` a mano) por un flujo automatizado del instalador.
- **Alcance:** incluye los pasos 7-11 de §D. Queda **fuera** de este paso: el mecanismo de arranque/servicio de la app (paso 5 de este plan).
- **Cambio concreto propuesto (futuro, no implementado ahora):** el instalador ejecuta, en orden y con verificación de éxito entre cada uno: creación de rol/base vía `psql`, generación de `.env` con la `DATABASE_URL` real, `prisma migrate deploy`, y `seed-instalacion.ts` con los datos ya cargados en `config/institucion.json`.
- **Dependencias:** paso 3 (necesita una instancia de Postgres operativa y con puerto/directorio ya conocidos).
- **Criterio de verificación:** tras correr el instalador de punta a punta en una PC limpia, existe una institución real cargada, un usuario admin funcional, y `prisma migrate status` reporta "up to date" sin pendientes ni drift (mismo criterio que ya usa `tests/checkMigraciones.test.ts`).
- **Riesgo si se omite o se hace fuera de orden:** si se genera el `.env` antes de confirmar que el usuario/base existen, o se corren migraciones antes de confirmar que Postgres arrancó, el instalador puede fallar de forma confusa a mitad de camino (riesgo ya señalado en §B, "instalación interrumpida").
- **Reversibilidad:** media — requiere revertir tanto archivos (`.env`) como estado de base de datos (usuario/base creados); acotado porque toda esta base es nueva (instalación desde cero), no hay datos previos en juego.
- **Estimación relativa de esfuerzo:** medio — reutiliza en gran parte scripts y validaciones que ya existen (`seed-instalacion.ts` ya valida su config de entrada), pero requiere orquestarlos y agregar las verificaciones de éxito entre pasos que hoy no existen.

### Paso 5 — Mecanismo de arranque/detención de la aplicación
- **Objetivo:** resolver el vacío real identificado en §11 — hoy no existe ningún mecanismo formal de arranque/detención de ALNEXT.
- **Alcance:** incluye decidir e implementar el mecanismo (servicio de Windows, tarea programada, o acceso directo con script propio) y registrarlo desde el instalador (§D, paso 12). Queda **fuera** de este paso: cualquier mecanismo de actualización de la app en caliente (eso es el paso 6).
- **Cambio concreto propuesto (futuro, no implementado ahora):** definir el mecanismo (a decidir en una etapa de análisis/aprobación previa, dado que es un cambio de arquitectura de ejecución, no solo de instalador) e integrarlo al instalador.
- **Dependencias:** pasos 1 y 4 (necesita el runtime embebido y la app ya configurada y migrada para poder arrancarla).
- **Criterio de verificación:** tras un reinicio de la PC, ALNEXT queda accesible en su puerto sin intervención manual (si se elige un mecanismo de arranque automático), o al menos existe un comando/acceso directo único y documentado para arrancarla (si se elige un mecanismo manual asistido).
- **Riesgo si se omite:** persiste el vacío actual — cada arranque/reinicio de la PC de la escuela requeriría intervención manual experta, inviable para un piloto real fuera del control directo del desarrollador.
- **Reversibilidad:** alta si es un script/acceso directo; media si es un servicio de Windows registrado (requiere desregistrarlo explícitamente).
- **Estimación relativa de esfuerzo:** medio.

### Paso 6 — Automatizar backup/restore dentro del instalador
- **Objetivo:** que el instalador registre automáticamente la tarea de backup (hoy un paso manual documentado, `Register-ScheduledTask`) en vez de requerir que el operador la configure a mano.
- **Alcance:** incluye únicamente el registro automático de la tarea ya validada (`backup-alnext.ps1` + `Register-ScheduledTask`, comandos ya probados según `docs/ Verdades del entorno — ALNEXT.md:83-90`). Queda **fuera** de este paso: cualquier mejora al script de backup/restore en sí (ej. verificación de integridad, señalada como `[NO DETERMINADO]` en §F) — no se pidió ni es necesaria para el piloto.
- **Cambio concreto propuesto (futuro, no implementado ahora):** el instalador ejecuta el mismo bloque de PowerShell ya documentado y probado, con las rutas absolutas correctas de la instalación recién creada.
- **Dependencias:** pasos 1, 3 y 4 (la app y la base deben existir antes de que tenga sentido programar backups).
- **Criterio de verificación:** tras la instalación, `Get-ScheduledTask -TaskName "ALNEXT-Backup"` (o el nombre que se use) existe y dispara correctamente según los triggers definidos — mismo criterio ya usado para validar esto manualmente el 11/09/2026 según la documentación de sesión.
- **Riesgo si se omite:** el piloto queda sin backups automáticos si el operador olvida el paso manual — riesgo de pérdida de datos operativos reales de la escuela.
- **Reversibilidad:** alta — desregistrar una tarea programada es trivial y no afecta datos.
- **Estimación relativa de esfuerzo:** bajo (reutiliza comandos ya validados en la práctica, solo falta invocarlos desde el instalador en vez de a mano).

### Paso 7 — Estrategia de actualización, incluida actualización de versión mayor de PostgreSQL
- **Objetivo:** tener un procedimiento (aunque sea manual al principio) para actualizar una instalación ya en producción en una escuela, sin perder datos ni afectar otras instalaciones de la PC.
- **Alcance:** incluye la estrategia general de actualización de app/Node (§E) y el procedimiento específico de cambio de versión mayor de PostgreSQL (instalación en paralelo + dump/restore, §E). Queda **fuera** de este paso: automatizar completamente ese procedimiento como un "instalador de actualización" con UI — para el piloto (una sola escuela, bajo volumen) puede quedar como procedimiento documentado y ejecutado manualmente por el desarrollador, análogo a como hoy se documenta la instalación inicial (§12).
- **Cambio concreto propuesto (futuro, no implementado ahora):** documento de procedimiento de actualización (paralelo a `docs/ Verdades del entorno — ALNEXT.md` pero para el ciclo de vida post-instalación), reutilizando `backup-alnext.ps1`/`restaurar-alnext.ps1` como mecanismo de migración de datos entre versiones mayores de Postgres.
- **Dependencias:** todos los pasos anteriores (no tiene sentido diseñar actualización antes de tener una primera instalación completa y funcionando).
- **Criterio de verificación:** un ejercicio real de "actualizar" una instalación de prueba (nueva versión de la app, o cambio de versión mayor de Postgres) preserva los datos operativos y el estado de licencia intactos, verificado comparando un dump antes/después.
- **Riesgo si se omite o se hace antes de tener los pasos 1-6 resueltos: bajo impacto inmediato (no bloquea el piloto), pero deja a la primera actualización real sin procedimiento probado, con riesgo de impacto en el único cliente piloto real.
- **Reversibilidad:** depende del procedimiento elegido — el patrón dump/restore para cambio de versión mayor es, por diseño, reversible mientras se conserve la instancia vieja hasta confirmar la nueva.
- **Estimación relativa de esfuerzo:** alto — es, junto con el paso 3, el de mayor incertidumbre del plan, con más preguntas marcadas `[NO DETERMINADO]` en esta auditoría (identificación de servicios, comportamiento real de actualización de instaladores de terceros).

---

## Hallazgos no relacionados encontrados durante la auditoría (documentados, no corregidos)

- `package.json:2` — `"name": "gestor_tmp"`, no `"alnext"` ni similar. No afecta funcionalidad, pero puede generar confusión si un futuro instalador deriva nombres de carpetas/servicios del `name` de `package.json`.
- Archivo `docs/ Verdades del entorno — ALNEXT.md` con espacio inicial en el nombre — ya señalado como pendiente por el propio repo (`docs/ Verdades del entorno — ALNEXT.md:64`), no corregido en esta auditoría por estar fuera de alcance (no se modificó ningún archivo).
- `Dockerfile` en la raíz, desalineado con el pivote a Windows nativo (§12) — no se eliminó ni modificó, solo se documenta la discrepancia, tal como indica la consigna.
- Archivos sueltos en la raíz sin relación aparente con el código de la app (`backup_pre_migracion_20260706_2303.dump`, `codigarios-dump.json`, `check.ts`, `gestor_tmp@0.1.0` (vacío), `next` (vacío), `node` (vacío), `estructura.txt`) — no se investigó su origen a fondo por estar fuera del alcance de esta auditoría (instalador/empaquetado); podrían ser resabios de sesiones anteriores, en la misma línea que los `.sql` sueltos ya identificados como pendientes de decisión en `docs/ Verdades del entorno — ALNEXT.md:100`.
