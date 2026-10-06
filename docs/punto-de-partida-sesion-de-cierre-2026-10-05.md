# Punto de partida — cierre de sesión 05/10/2026

## 1. Resumen del día

Tres hilos: (a) preparar la grabación del video de demostración, (b) mejorar el wizard de "Nueva incidencia" con la información necesaria para saber sobre qué asignación se carga, y (c) empezar a preparar la **actualización de instalaciones existentes** (paquete v4 y notebook de Ceferino) con los cambios de código de hoy. El hilo (c) quedó a medias por un problema del pendrive.

### 1.1 Entorno de demo y video

- Base aislada `alnext_demo` (institución "Escuela Ejemplo"), ya descripta en el cierre del 02/10. Las credenciales de la demo están en `config/institucion-demo.json`, que **está ignorado por git** (`.gitignore:49`) y no figura en el repo (verificado con `git ls-files` y `git check-ignore`).
- Arranque contra la demo: `DATABASE_URL` apuntando a `alnext_demo` (mismo usuario/clave de Postgres local que `.env`) y `DEV_TENANT_DOMAIN=""`, con `npm start`. Los cambios de código requieren `npm run build` antes (producción).
- **Al terminar de grabar**: volver a levantar con `npm start` sin variables extra para regresar a `gestor_horarios`.
- Se explicaron opciones de grabación (Xbox Game Bar `Win+Alt+R`, Recortes `Win+Shift+R`, OBS) y se dio el diálogo del video.
- Para que el Dashboard muestre datos durante la grabación hay que cargar al menos una incidencia **con fecha de hoy** (ver 1.3).

### 1.2 Wizard "Nueva incidencia" (UX-INC-015 a 019)

Problema: al crear la incidencia, la tabla mostraba pocos datos para identificar la asignación (el listado final sí mostraba materia y comisión). Cambios, en cuatro commits en `feature/instalador-alnext`:

- **Paso 1 (Seleccionar) y Paso 2 (Revisar lote):** columnas **Materia** y **Distribución** (horarios + resumen de módulos por día, ej. `Lun 07:30–08:50` / `Lun (2)`); la búsqueda ahora también filtra por materia.
- **Paso 3 (Incidencia):** el resumen del lote muestra materia y curso · comisión junto a cada agente.
- **Paso 4 (Reemplazos):** el encabezado de cada grupo muestra materia · curso · comisión y la distribución. El módulo se muestra abreviado (`Mié 11:10–11:45`, antes `MIERCOLES 11:10–11:45`).
- **Resultado de la carga:** columnas Materia, Curso / Comisión y Distribución. El hook ahora expone la lista completa `asignaciones`.
- **Backend:** `asignacionRepository.listarParaIncidencia` incluye la distribución ACTIVA (`take: 1`); el listado general de Asignaciones no se tocó. Componente nuevo `DistribucionResumen.tsx`.
- **Cargos por jornal** (criterio ya usado por Dashboard/reportes: `!asignacion.materia`): la distribución se muestra como "Cargo por jornal" + días (sin horarios que sugieran clases reales), y la clase sin módulo se rotula "Jornada completa" en lugar de "Sin módulo" (UX-INC-019).
- Prueba con un cargo por jornal (Preceptoría): sin distribución cargada queda "Sin clases vigentes" (deshabilitado, por dato, no por diseño); con distribución activa queda habilitado y genera una clase por día sin módulo.
- Decisión: **no** agregar la distribución al listado de incidencias (no ayuda a identificarla, muestra la semana completa y no el día afectado, agranda las filas).

Commits: `1c91bf8`, `97a34f0`, `566f3eb`. Tareas #276 y #277 cerradas.

### 1.3 Dashboard — hallazgos (sin cambios de código)

- **Rankings:** cuentan incidencias con `fecha_desde <= ahora` para los rangos Mes/6 meses/Año; el rango **"Todo" no tiene límite superior** y por eso incluye futuras (inconsistencia, tarea #279). Los rankings se actualizan solos al llegar cada fecha.
- **Tendencia de cobertura y mapa de calor:** comparten el `timeline` armado en `app/api/dashboard/overview/route.ts`, con ventana histórica `hasta = hoy` (7/14/30 días hacia atrás). Los días futuros quedan en "-" aunque ya haya clases suspendidas por incidencias cargadas. Propuesta de proyección de la semana en curso registrada como tarea #278 (requiere leer `calcularCobertura` antes de definirla).
- KPI "Incidencias activas" cuenta las vigentes hoy (choque de nombres ya investigado en #54).

### 1.4 Actualización de instalaciones existentes — hallazgos y procedimiento

**Cómo está instalada la app (verificado en la VM, instantánea 4):**

- La app vive en **`<carpeta donde se descomprimió el paquete>\app`** (en la VM: `C:\ALNEXT-paquete-offline\app`), con `.next`, `.env` y `app-service.log`. **No** está en `C:\ALNEXT\app` (ese es solo el valor por defecto de `-AppDir`; hay que pasar el parámetro). No mover ni borrar esa carpeta: la tarea apunta a ella.
- `C:\ALNEXT` contiene solo `node` y `pgsql`. Servicio `postgresql-alnext` corriendo; `http://127.0.0.1:3000/public/login` responde 200.
- La tarea `ALNEXT-App` no se pudo confirmar desde una consola no elevada (tampoco la línea de comandos de `node`); verificar con PowerShell como administrador.
- `Install-AppService.ps1` compila (`next build` con `node.exe` directo) y es **idempotente**: libera el puerto si lo ocupa un `node.exe`, da de baja y recrea la tarea, la inicia y espera respuesta. Por eso el paquete no lleva `.next`.
- Dependencias y schema: el último commit que toca `package.json`, `package-lock.json` o `prisma/` es del 16/09 (`9955f28`), anterior al paquete v3 (25/09). **No hacen falta `npm ci` ni migraciones** para los cambios de hoy.

**Procedimiento diseñado (no ejecutado todavía):**

1. En WSL: `git archive --format=zip -o /mnt/c/Users/leand/alnext-fuentes.zip HEAD`. Tamaño 1.319.517 bytes, SHA256 esperado `26504273B75F8D4C500A1190D665947CF99E54263CAC912BFD60325BFF7990A7`.
2. En el destino: verificar el hash, `Expand-Archive` a una carpeta temporal y `robocopy <temporal> <paquete>\app /E /XD node_modules .next .git .claude backup_gestor_horarios docs tests installer /XF .env app-service.log check.ts codigarios-dump.json "backup_pre_migracion_20260706_2303.dump" estructura.txt "gestor_tmp@0.1.0" CLAUDE.md README.md Dockerfile vitest.config.ts` (sin `/MIR`). Comprobar `Test-Path ...\features\incidencias\components\DistribucionResumen.tsx`.
3. PowerShell **como administrador**: `$env:Path = "C:\ALNEXT\node;" + $env:Path`, `Set-ExecutionPolicy Bypass -Scope Process -Force`, `cd <paquete>\installer`, `.\Install-AppService.ps1 -AppDir <paquete>\app`. Esperar `exitCode` 0.
4. Verificar login y wizard de Nueva incidencia.
5. **Paquete v4** = v3 con los fuentes nuevos encima (sin necesidad de git en la VM); regenerar zip, hash y transferir con verificación.

**Hallazgo del pendrive:** tres copias distintas (escritorio de la VM, pendrive con `Copy-Item` y pendrive con el Explorador) dieron el mismo hash erróneo (`1C02F70C…75A6`) con el mismo tamaño, mientras el origen en Windows y WSL da el correcto. Se descartó el método de copia: el pendrive tiene un defecto físico. **Lección para la guía:** verificar el hash **después de expulsar y reenchufar** el pendrive (la primera lectura sale de la caché y puede dar bien con el contenido grabado dañado). Usar otro pendrive o carpeta compartida de VirtualBox (requiere Guest Additions).

**Instantáneas de VirtualBox (VM `ALNEXT-test`):** se tomó una instantánea del estado con las pruebas de Tailscale del 02/10 (nombre engañoso: "…priemr instalacion de punta a punta sin modificar", 5/10 18:26; conviene renombrarla a "02-10 con Tailscale") y luego se restauró la **Instantánea 4 original (25/9 17:40)**, que es el espejo de Ceferino (instalada, sin Tailscale) y sirve de ensayo con marcha atrás.

### 1.5 Tareas

- Cerradas: #222 (instalador único), #276, #277.
- Creadas: #278 (UX-DSH-008, proyección en mapa de calor), #279 (UX-DSH-009, rango "Todo" de rankings), #280 (UX-INC-020, columna del suplente en "Reemplazos asignados").

## 2. Pendientes para la próxima sesión (en orden)

1. **Conseguir otro pendrive** (o usar carpeta compartida) y copiar `alnext-fuentes.zip` con el Explorador; expulsar, reenchufar y verificar el hash en la PC antes de llevarlo a la VM.
2. **Ensayo de actualización en la VM** (instantánea 4): pasos 1 a 4 de la sección 1.4.
3. **Paquete v4**: v3 + fuentes nuevos; zip, hash y transferencia verificada.
4. **Actualizar la notebook de Ceferino**: antes, con PowerShell como administrador, listar la carpeta `app`, `Test-Path .\app\.next` y el estado de la tarea `ALNEXT-App` (y cuál es la carpeta real del paquete). Mantener copia de respaldo del código actual antes de pisar.
5. **Video**: terminar la grabación sobre `alnext_demo` (incidencia con fecha de hoy, reemplazo, reporte de horas) y volver a `gestor_horarios`.
6. **Seguridad P0/P1 antes de cargar datos reales**: #205, #206, #207, #217.
7. **Ceferino**: Parte B (Tailscale + control de licencia) y carga de datos operativos reales; guardar hostname y clave del rol remoto en el gestor de contraseñas.
8. **UX y deuda**: #278, #279, #280, resto de UX-ADM (#212–#216), tests #167–#173, #247 (CUIT editable), #189, #191.