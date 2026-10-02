# Punto de partida — cierre de sesión 25/09/2026

## 1. Resumen del día

Objetivo de la sesión: reempaquetar el instalador offline de ALNEXT con los dos fixes de build del 24/09 (Google Fonts → fuentes del sistema, Suspense boundary en `useSearchParams`), transferirlo de forma confiable a una VM genuinamente offline, y correr **la primera validación end-to-end completa** del instalador (`Install-ALNEXT.ps1`) en una máquina limpia sin internet.

**Resultado: éxito.** Los 4 pasos del instalador corrieron limpios (`exitCode: 0` en cada uno), la app compiló sin errores de fonts ni de Suspense, y el login funcionó en `http://127.0.0.1:3000/public/login`.

### 1.1 Reempaquetado (`ALNEXT-paquete-offline-v3.zip`)

En `ALNEXT-test`, se reconstruyó desde cero la carpeta `C:\ALNEXT-paquete-offline` (decisión explícita: pisar completo, no sincronizar in-place) con:

- `git pull` del repo, `npm ci`, `npm run build` — confirmando que los fixes de fonts y Suspense seguían aplicados (se habían perdido una vez en la sesión por un revert de snapshot de VirtualBox, y se rehicieron).
- Auditoría completa de la raíz de `C:\ALNEXT\app` ("no dar nada por sentado") para detectar carpetas/archivos nuevos no cubiertos por las exclusiones de `robocopy` existentes. Se encontraron `ciclos/` (excluida, docs de sprint), `tools/` (**incluida** a pedido explícito, contiene `Set-EstadoInstitucion.ps1` para pruebas futuras con Tailscale), un `run-app-service.bat` residual de VM (excluido), y dos archivos sueltos de 0 bytes llamados `next` y `node` en la raíz (dejados intactos — agregar esos nombres literales a `/XF` repetiría el bug catastrófico de una sesión anterior que excluyó binarios reales dentro de `node_modules`).
- Decisión explícita: excluir `pgsql` (el runtime de Postgres ya instalado en la VM, innecesario) pero incluir `postgres-installer` (el `.exe` real descargable), `app`, `installer`, `node` (Node.js portátil), `tailscale-installer`, `check.sql`.
- Compresión final con `tar -czf` (falló primero por consola no elevada — el error "Failed to open" no era de Defender ni de espacio en disco, sino falta de privilegios de administrador al escribir en `C:\`).

Resultado: `C:\ALNEXT-paquete-offline-v3.zip`, **669,735,642 bytes (638.7 MB)**, **36,240 entradas** verificadas con `tar -tzf`.

**Hash de referencia (SHA256):**
```
FD5DDC397D6BC07318A355028A2B77D60072B85F511AA014811DBB0A4C19A12E
```

### 1.2 Bug de corrupción en la transferencia por pendrive — diagnosticado

Al copiar el zip desde `ALNEXT-test` al pendrive:

- **`Copy-Item`**: copia "exitosa" (mismo tamaño, sin error), pero hash `2FBAB43F...` — no coincide.
- **`robocopy /J /R:3 /W:5`** (unbuffered I/O, con reintentos): también "exitoso" sin errores reportados, pero hash `C658083...` — tampoco coincide, y **distinto** al de `Copy-Item`.
- `chkdsk E:` no encontró problemas de sistema de archivos (FAT32 sano).
- **Conclusión**: dos herramientas de copia distintas, ambas reportando éxito total, produciendo corrupciones *distintas* → no es el pendrive físico ni el sistema de archivos, es la capa de emulación USB de VirtualBox interactuando mal con la copia automatizada desde dentro del guest.
- **Solución que funcionó**: copiar el archivo "a mano" (arrastrar/soltar o copiar-pegar por el Explorador de Windows) desde la VM al pendrive. Hash verificado idéntico al original (`FD5DDC39...`) en el pendrive.

**Lección para la próxima transferencia de archivos grandes por USB desde una VM de VirtualBox**: preferir copia manual por Explorador antes que `Copy-Item`/`robocopy` automatizados. Verificar siempre con `Get-FileHash -Algorithm SHA256` en cada salto, nunca confiar solo en el tamaño reportado.

### 1.3 Resguardo de progreso

Se tomó una instantánea de VirtualBox en `ALNEXT-test` (nombre: `paquete-offline-v3-verificado-25-09`) antes de seguir, para no repetir la pérdida de trabajo por revert accidental de snapshot que ocurrió más temprano en la sesión.

### 1.4 Validación end-to-end en VM en blanco (offline real)

Con el pendrive ya verificado, se copió el zip al escritorio de la VM en blanco (sin internet), se verificó hash ahí también (coincide), se descomprimió, y se corrió el instalador completo. Detalle completo del procedimiento en la sección 2 de este documento (generalizado como guía reutilizable).

**Hallazgos durante la corrida:**
- Faltaba mover `node/` a la ruta fija `C:\ALNEXT\node` (requisito hardcodeado de `Add-NodePortableAlPath` en `Common.ps1`, sin parámetro). Sin esto, el Paso 3 falla con `'npx' no se reconoce...`.
- Al reintentar tras crear el rol `alnext_app` en el intento fallido anterior, hubo que pasar `-AllowExistingInstallation` y `-AppRolePassword` con la contraseña autogenerada en el primer intento (el script no permite reconstruir el `DATABASE_URL` sin ella en un re-run).
- La ruta raíz `/` de la app sirve la página default de Next.js (no está customizada) — el login real está en `/public/login`.

**Resultado final:**
```json
{"preflightOk":true,"postgresOk":true,"databaseOk":true,"appServiceOk":true,"exitCode":0}
```
Login confirmado con `admin@alnext.test` / `AdminTest2026!` en `http://127.0.0.1:3000/public/login`.

---

## 2. Guía reutilizable: instalación offline completa en una PC nueva

Pasos desde que el paquete llega al escritorio de una PC virgen (sin internet) hasta tener ALNEXT corriendo.

### 2.1 Prerrequisitos del paquete

El zip (`ALNEXT-paquete-offline-vX.zip`) debe contener, en su raíz:
- `app/` — código de la aplicación Next.js
- `installer/` — los scripts PowerShell (`Install-ALNEXT.ps1`, `Common.ps1`, `Preflight.ps1`, `Install-Postgres.ps1`, `Install-Database.ps1`, `Install-AppService.ps1`, opcionalmente `Install-Tailscale.ps1`)
- `node/` — Node.js portátil (build completo, no solo el `.exe`)
- `postgres-installer/` — el instalador real de PostgreSQL (`.exe`), NO el runtime ya instalado
- `tailscale-installer/` (opcional, solo si se va a configurar acceso remoto)
- `check.sql` (opcional, script de verificación)

**No incluir** una carpeta `pgsql` con un runtime ya instalado — `Install-Postgres.ps1` instala Postgres limpio en el destino.

### 2.2 Verificar integridad antes de tocar nada

```powershell
Get-FileHash "C:\Users\<usuario>\Desktop\ALNEXT-paquete-offline-vX.zip" -Algorithm SHA256
```

Comparar contra el hash de referencia entregado junto con el paquete. **No continuar si no coincide.**

### 2.3 Descomprimir

```powershell
mkdir C:\ALNEXT-paquete-offline -Force
tar -xzf "C:\Users\<usuario>\Desktop\ALNEXT-paquete-offline-vX.zip" -C C:\ALNEXT-paquete-offline

Get-ChildItem C:\ALNEXT-paquete-offline
```

Confirmar que aparecen `app`, `installer`, `node`, `postgres-installer` (y opcionalmente `tailscale-installer`, `check.sql`).

### 2.4 Mover Node.js portátil a la ruta fija requerida

`Add-NodePortableAlPath` (en `installer/Common.ps1`) tiene como default hardcodeado `C:\ALNEXT\node`, sin parámetro para cambiarlo. **Este paso no es opcional** — sin él, el Paso 4/4 del instalador falla porque `npx`/`node` no están en el PATH.

```powershell
mkdir C:\ALNEXT -Force
robocopy C:\ALNEXT-paquete-offline\node C:\ALNEXT\node /E

Test-Path C:\ALNEXT\node\node.exe   # debe dar True
Test-Path C:\ALNEXT\node\npx.cmd    # debe dar True
```

### 2.5 Habilitar ejecución de scripts (solo para esta sesión de consola)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
```

### 2.6 Confirmar que la PC está realmente offline (si la prueba requiere validar el escenario sin internet)

```powershell
Test-NetConnection 8.8.8.8 -InformationLevel Quiet   # debe dar False
```

### 2.7 Verificar nombre exacto del instalador de Postgres

```powershell
Get-ChildItem C:\ALNEXT-paquete-offline\postgres-installer
```

Usar el nombre real del `.exe` en el parámetro `-PgInstallerPath` del paso siguiente (puede variar según la versión empaquetada).

### 2.8 Correr el orquestador completo (requiere consola elevada — Administrador; el script auto-eleva vía UAC si no lo está)

```powershell
cd C:\ALNEXT-paquete-offline\installer

.\Install-ALNEXT.ps1 `
  -PgInstallerPath "C:\ALNEXT-paquete-offline\postgres-installer\<nombre-real-del-exe>" `
  -SuperPassword "<contraseña-super-postgres>" `
  -InstitucionNombre "<nombre-institución>" `
  -InstitucionCuit "<cuit>" `
  -InstitucionEmail "<email-institución>" `
  -AdminNombre "<nombre-admin>" `
  -AdminEmail "<email-admin>" `
  -AdminPassword "<password-admin>" `
  -AppDir "C:\ALNEXT-paquete-offline\app"
```

Parámetros mandatorios: `-PgInstallerPath`, `-SuperPassword`, `-InstitucionNombre`, `-InstitucionCuit`, `-InstitucionEmail`, `-AdminNombre`, `-AdminEmail`, `-AdminPassword`.

Parámetros opcionales relevantes: `-PgPort` (default 5433), `-Prefix` (default `C:\ALNEXT\pgsql`), `-AppPort` (default 3000), `-AppDir` (default `C:\ALNEXT\app` — pasar explícito si el paquete se extrajo en otra ruta), `-AllowExistingInstallation` (ver 2.9), `-AppRolePassword` (ver 2.9).

El orquestador corre 4 pasos en secuencia:
1. **Preflight** — verifica elevación, puerto libre, instalaciones previas.
2. **Instalación de Postgres** — instala el motor en `-Prefix`.
3. **Base de datos y seed** — crea rol `alnext_app`, base `alnext`, corre migraciones de Prisma, genera `.env` y `config/institucion.json`, siembra institución + admin.
4. **Arranque persistente de la app** — corre `next build`, registra una Tarea Programada (`ALNEXT-App`, dispara al iniciar Windows, corre como SYSTEM), la inicia, y espera a que responda en `http://127.0.0.1:<AppPort>`.

Resultado esperado al final:
```json
{"preflightOk":true,"postgresOk":true,"databaseOk":true,"appServiceOk":true,"exitCode":0}
```

### 2.9 Si hay que reintentar un paso fallido (Postgres/rol/base ya creados)

Si el Paso 3 o 4 falla y hay que volver a correr `Install-ALNEXT.ps1`:

- Agregar `-AllowExistingInstallation` (permite reusar Postgres, el rol y la base si ya existen).
- Si el rol `alnext_app` ya fue creado en un intento anterior, agregar `-AppRolePassword "<la-misma-contraseña-que-se-generó-la-primera-vez>"` — el script no puede reconstruir el `DATABASE_URL` sin ella. Esa contraseña aparece en el JSON de salida del primer intento (`appRolePassword`), **guardarla apenas se genera**.

### 2.10 Verificar visualmente

Abrir un navegador en la misma PC:

```
http://127.0.0.1:3000/public/login
```

(la ruta raíz `/` sirve la página default de Next.js sin customizar — no es el login).

Iniciar sesión con el email/password de `-AdminEmail`/`-AdminPassword`. Si carga el dashboard, la instalación está confirmada.

---

## 3. Pendientes para la próxima sesión

- Cargar datos reales de la escuela piloto (Colegio Ceferino) a través del mecanismo de configuración del instalador (tarea #11).
- Definir y aplicar el flujo de instalación con datos reales de producción (no de prueba) para una primera instalación real.
- Revisar si conviene documentar/automatizar más el protocolo de copia manual por Explorador para transferencias USB desde VMs de VirtualBox, dado que es el único método confiable encontrado hasta ahora.
- Pendientes de deuda técnica ya identificados y sin tocar hoy: auditoría de 45 tests desactualizados (#167-173), ítems P0 de seguridad en administración de usuarios (#205, #206, #207, #217).
- CUIT editable en `actualizarMiInstitucion.ts` (#247).

## 4. Estado de tareas cerradas hoy

- #272 — Corregir robocopy y re-validar Paso 4/4 del instalador offline → **completada**
- #248 — Definir estrategia de empaquetado (Node.js + código de la app en la máquina destino) → **completada**
