---

## Discrepancia encontrada y resuelta — tres configuraciones de Postgres, dos muertas

| Fuente | Motor | Puerto | DB | Estado real |
|---|---|---|---|---|
| `.env` | Postgres 18 nativo | 5433 | `gestor_horarios` | ✅ Es lo que corre de verdad |
| `docker-compose.yml` | Postgres 15 en contenedor | 5432 | `gestor_horarios` | ❌ Muerto — cero referencias reales (solo cachés de `graphify-out` y `node_modules` de terceros). Se borra. |
| `package.json` → `test:run` (versión vieja) | — | 5432 | `gestor_test` | ❌ Rota tal como estaba escrita |

**Resuelto (29/07):** el propio repo ya tenía la respuesta — `docs/punto-de-partida-clase-programada-2026-07-21.md` (línea 52) documenta que este mismo problema se diagnosticó el 21/07 y se resolvió creando `gestor_test` sobre el Postgres nativo de 5433 (separado de `gestor_horarios`, sin tocarla). La solución vivía en un doc pero nunca se volvió a escribir en `package.json`. Correcciones aplicadas:

```json
"test:run": "cross-env DATABASE_URL=postgresql://admin:admin123@localhost:5433/gestor_test?schema=public vitest run --reporter=verbose"
```
```bash
git rm docker-compose.yml
```

---

## Resuelto — bcrypt vs bcryptjs

El código real (`lib/usecases/auth/iniciarSesion.ts` — login, y `app/api/usuarios/route.ts` — alta de usuario) usa **`bcryptjs`**. Solo `prisma/seed.ts`, `tests/auth.test.ts` y `tests/helpers/factories.ts` usaban `bcrypt` (nativo) sin necesidad. Se estandarizó todo a `bcryptjs`:

```bash
npm uninstall bcrypt @types/bcrypt
```
Y cambiar el import en esos 3 archivos: `import bcrypt from "bcrypt"` → `import bcrypt from "bcryptjs"`.

**Impacto en portabilidad:** esto saca la única dependencia nativa del proyecto — una máquina nueva ya no necesita build tools (`python3`, `make`, `g++`) para que `npm install` funcione. Verificado con `npm run test:run`: 369/371 en verde, incluidos login/logout.

---

## Resuelto — DOTENV_KEY y BOOK_LANG eran ruido

Grep dirigido, excluyendo `node_modules`, no devolvió nada:
```bash
grep -rn "DOTENV_KEY\|BOOK_LANG" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```
Confirmado: ninguno de los dos es código propio. Salieron del grep original porque ese no excluía `node_modules` — casi seguro son definiciones de tipos de la librería `dotenv` (`DOTENV_KEY` es su convención para `.env.vault`) y ruido similar a `process.env.foo`. Cerrado, sin acción.

---

## Resuelto — prisma/triggers.sql era un resabio del traspaso de PC

Origen aclarado por el usuario: quedó del traspaso de ALNEXT de la PC vieja a la actual, nunca se integró como migración de Prisma. Verificado empíricamente contra `gestor_horarios` (la base de dev real, no la de test):

```bash
psql "postgresql://admin:admin123@localhost:5433/gestor_horarios" -c "SELECT trigger_name, event_object_table, action_timing, event_manipulation FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name;"
```
→ `(0 rows)`. Cero triggers activos en la base real. Confirmado que el archivo es un resabio muerto, no comportamiento vigente sin documentar. Se borra:
```bash
git rm prisma/triggers.sql
```

**Relacionado, sin resolver todavía:** `backup_antes_migracion.sql` y `gestor_horarios_backup.sql` en la raíz del repo tienen la misma pinta de resabios del mismo traspaso de PC. Mismo criterio pendiente de aplicar (confirmar si siguen haciendo falta antes de decidir) — no se tocaron todavía.

---

## Abierto — falta confirmar antes de cerrar el plan de instalación

1. El seed real de Codigario + Colegio Ceferino (mencionado en sesiones anteriores como "armado") no aparece en el grep de env vars ni se compartió el archivo — probablemente vive aparte, sin confirmar todavía.
2. Cosmético: el propio archivo de verdades quedó guardado en el repo como `docs/ Verdades del entorno — ALNEXT.md` (con espacio inicial) — renombrar a `docs/verdades-entorno-alnext-2026-07-29.md` para no romper la convención de nombres del resto de `docs/`.

---

## Esqueleto del plan de instalación en máquina nueva (borrador — actualizado con lo resuelto el 29/07)

1. WSL2 + Ubuntu 26.04, `systemd=true` en `/etc/wsl.conf` desde el arranque.
2. Node — fijar la versión exacta (sigue pendiente agregar `engines` o `.nvmrc` al repo; hoy no hay nada que lo fuerce, ver "Confirmado → Node").
3. Postgres 18 vía `apt` (no Docker) — crear cluster en puerto **5433** (ya no hay ambigüedad: `.env` y `test:run` quedaron alineados a este puerto, `docker-compose.yml` se borró).
4. Rol `admin`/`admin123` (o credenciales reales) + bases `gestor_horarios` (dev) y `gestor_test` (test) en el mismo cluster.
5. Clonar repo, `npm install` — **ya no hace falta ningún build tool nativo** (`bcrypt` se sacó del proyecto, todo corre sobre `bcryptjs`, puro JS).
6. Copiar el `.env` directo a la máquina nueva — `DOTENV_KEY` era ruido de tipos de la librería `dotenv`, no se usa `dotenv-vault` en este proyecto.
7. `npx prisma migrate deploy`. (`prisma/triggers.sql` se borró — no era parte de ninguna migración ni estaba activo en la base real, no hace falta aplicarlo en la máquina nueva.)
8. `npm run seed`.
9. Cargar datos operativos (agentes, asignaciones, período operativo → activar) para tener algo de data real, siguiendo el flujo completo para que el motor de resolución corra desde el principio.
10. Antes de correr los tests: levantar el servidor en background y esperar a que responda (`nohup npm run dev:test & disown` + polling con `curl` a `localhost:3000`) — los tests de endpoints dependen de un servidor real levantado, no alcanza con `npm run test:run` solo.
11. `npm run dev` / `npm run test:run` para confirmar que todo levanta.