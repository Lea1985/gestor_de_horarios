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

## Esqueleto del plan de instalación en máquina nueva (Windows nativo — reescrito 11/09/2026)

**Pivote de arquitectura (10-11/09/2026):** el destino de instalación pasa de WSL2+Ubuntu a **Windows nativo**. Motivos: las máquinas de las escuelas se apagan al finalizar la jornada (un cron/scheduler dentro de WSL2 no es confiable en ese escenario — Windows Task Scheduler sí, corre como servicio real); y el proyecto ya no depende de ningún build nativo (`bcrypt` → `bcryptjs`), así que no hace falta WSL2 para que `npm install` funcione. Validado en la práctica: Postgres 18 nativo, backup automático (Task Scheduler), backup manual y restauración probados de punta a punta el 10-11/09.

1. **Windows 10/11**, cuenta de usuario estándar de la escuela (administrador solo para los pasos de instalación inicial: Postgres, Node, Task Scheduler).
2. **Node.js LTS** — instalar vía el instalador oficial (`.msi`) o `winget install OpenJS.NodeJS.LTS`. Sigue pendiente fijar la versión exacta con `engines` en `package.json` o `.nvmrc` (no resuelto todavía, aplica igual en Windows que en WSL2 — ver "Abierto" arriba).
3. **PostgreSQL 18 nativo** — instalador oficial de EDB (recomendado sobre `winget install PostgreSQL.PostgreSQL.18`, porque el instalador gráfico permite fijar la contraseña del superusuario `postgres` durante la instalación; la instalación silenciosa de winget la omite y obliga a un reseteo manual después — procedimiento validado el 10/09 si hace falta: backup de `pg_hba.conf` → `trust` temporal → `ALTER USER postgres WITH PASSWORD '...'` → restaurar `pg_hba.conf` → reiniciar servicio, todo como Administrador).
   - Puerto: **5432** (default) para la máquina de la escuela — no hay conflicto con ningún otro Postgres ahí, a diferencia de la máquina de dev (que usa 5433 para convivir con el Postgres de WSL2). Ajustar `DATABASE_URL` del `.env` de instalación en consecuencia.
4. **Rol y bases** — crear el rol de la app y las bases `gestor_horarios` (o el nombre real de producción) en el cluster nativo.
5. **Clonar el repo directo en una ruta de Windows** (ej. `C:\ALNEXT\gestor_clean`) — ya no hace falta WSL2 en ningún paso. `npm install` — sin build tools nativos, `bcryptjs` es puro JS.
6. **Copiar el `.env`** a la máquina nueva — archivo de texto plano, sin `dotenv-vault` ni `DOTENV_KEY` real de por medio (era ruido, ver "Resuelto" arriba).
7. `npx prisma migrate deploy`.
8. `npm run seed`.
9. **Seed de "Mi institución"** (UX-ADM-004: domicilio, teléfono, CUIT para headers de PDF) — cargar directo en el seed inicial, sin pantalla dedicada (decisión ya registrada en el plan pre-piloto).
10. Cargar datos operativos (agentes, asignaciones, período operativo → activar) para tener data real antes de arrancar.
11. **Backup automático** — copiar `scripts/backup-alnext.ps1` y `scripts/restaurar-alnext.ps1` (ya en el repo) y registrar la tarea programada con los comandos validados el 11/09:
```powershell
    $accion = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-ExecutionPolicy Bypass -File "C:\ALNEXT\gestor_clean\scripts\backup-alnext.ps1"'
    $trigger1 = New-ScheduledTaskTrigger -AtLogOn
    $trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 3650)
    $config = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
    Register-ScheduledTask -TaskName "ALNEXT-Backup" -Action $accion -Trigger @($trigger1, $trigger2) -Settings $config -Description "Backup automatico ALNEXT"
```
    Nota: sin `-DatabaseUrl`, el script lee `DATABASE_URL` directo del `.env` del proyecto — no hace falta hardcodear la conexión en la tarea programada, a diferencia de las pruebas contra la base de prueba.
12. Antes de correr tests: levantar el servidor en background. En Windows, equivalente a `nohup ... & disown`:
```powershell
    Start-Process powershell -ArgumentList "npm run dev:test" -WindowStyle Hidden
```
    y luego hacer polling con `Invoke-WebRequest` a `localhost:3000` hasta que responda, antes de correr los tests de endpoints.
13. `npm run dev` / `npm run test:run` para confirmar que todo levanta.
14. **Prueba final** (ya registrada como punto 12 del plan pre-piloto): instalación limpia + restauración de un backup real (`restaurar-alnext.ps1`) + datos realistas + recorrido completo, antes de instalar en la escuela.

**Pendiente sin resolver, no bloqueante:** el seed real de Codigario + Colegio Ceferino (tarea #11) sigue sin ubicarse/confirmarse — insumo del paso 8-9 de este esqueleto. Los dos `.sql` sueltos en la raíz del repo (`backup_antes_migracion.sql`, `gestor_horarios_backup.sql`) siguen sin decisión — candidatos a borrar antes de que el nuevo sistema de backups (con su propia carpeta `backups/`, ya en `.gitignore`) genere confusión con ellos.
