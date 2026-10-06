# Punto de partida — cierre de sesión 06/10/2026

Continúa el cierre del 05/10. Rama `feature/instalador-alnext`, repo `Lea1985/gestor_de_horarios`.

## 1. Resumen del día

1. **Bug P0 de zona horaria (#282): corregido y validado en la VM.**
2. **Procedimiento de actualización en el lugar: validado de punta a punta** en la VM (instantánea 4, espejo de Ceferino).
3. **Video de demostración: grabado** (tercera toma, buena). Pendientes menores de postproducción.
4. **Mañana: actualizar la notebook de Ceferino** (ver sección 4).

## 2. Hallazgos y cambios

### 2.1 Bug de zona horaria (#282, P0) — commit `087044f`

- Causa: `getDay()` (hora local) aplicado a fechas guardadas en UTC. En zonas con offset negativo (Argentina, UTC-3) una fecha como "lunes 00:00 UTC" se leía como domingo, y las clases se generaban con un día de corrimiento.
- Archivos: `lib/helpers/clases.ts` (líneas 66 y 89) y `lib/usecases/horario/obtenerHorarioSemana.ts` (línea 32). Cambio: `getDay()` → `getUTCDay()`.
- Cómo apareció: al intentar grabar el video con un período 5–9/10 y una distribución de lunes, la clase del lunes 5 no se generaba bien.
- **Validación en la VM:** se activó el período "prueba 2" (12/10 → 17/10); "Se generó 1 clase para 1 distribución vigente" y la clase de Matemática (1ª comisión, 07:30–08:10) cayó el **lunes 12/10**. Correcto.
- **Importante:** las clases ya generadas con el bug **no se corrigen solas**. Quedan corridas hasta regenerarlas (ver 4.3).
- Pendiente opcional: test de regresión que cubra un período con módulo de lunes y un domingo de borde.

### 2.2 Actualización en el lugar — procedimiento validado

Resultados en la VM (paquete en `C:\ALNEXT-paquete-offline`):

- Zip de fuentes v2 (con el fix `getUTCDay`) verificado: SHA256 `542E7AEE541F07976BE9EBBC22FC9F2F435B2B5C2044CEEEB83590AF3F2D3FB1`.
- `robocopy` sin errores; `getUTCDay` confirmado en líneas 66 y 89 de `clases.ts`.
- `Install-AppService.ps1 -AppDir C:\ALNEXT-paquete-offline\app`: compila y registra la tarea, pero devolvió **exit 6 (la app no respondió a tiempo)**.
- **Diagnóstico: falso negativo.** El log mostraba cada arranque llegando a "Ready" sin errores; el primer arranque en frío tardó **65,5 s** en esta VM de pocos recursos y superó la espera del instalador. No hubo bucle de caídas (lo que parecía "titilar" eran los arranques del instalador más los `Stop`/`Start` manuales). Se descartó la batería (`DisallowStartIfOnBatteries` y `StopIfGoingOnBatteries` en False).
- Tras arrancar a mano: tarea `Running`, `node` estable durante 120 s, login `200`.
- **Regla práctica:** si el instalador devuelve exit 6, **no reinstalar**: esperar 2 min y probar el login (`http://127.0.0.1:3000/public/login`).
- `LastTaskResult 267014` = "terminada por el usuario" (consecuencia de nuestro `Stop-ScheduledTask`), no un error.
- Mejora posible (nueva tarea): subir el timeout de espera de `Install-AppService.ps1` o diferenciar "no respondió" de "falló".

### 2.3 Lecciones

- **Pendrive:** verificar el SHA256 **después de expulsar y reenchufar**. Un pendrive defectuoso dio el mismo hash erróneo con tres métodos de copia. Se resolvió con otro pendrive.
- **Consola de PowerShell:** hacer clic dentro de la ventana la pausa (modo selección); Esc o Enter la reanuda. Para esperas largas, usar un bucle corto con salida por línea en vez de un `Start-Sleep` largo.
- **Consola no elevada:** no ve las tareas de SYSTEM ni la línea de comandos de sus procesos; verificar siempre como administrador.
- **SEC (#281, P1):** el build y el arranque imprimen `DB USADA: postgresql://usuario:contraseña@...`. También queda en `app-service.log` de las instalaciones. Al compartir logs, filtrar esa línea (`Where-Object { $_ -notmatch 'DB USADA' }`). Pendiente quitar el `console.log`.

### 2.4 Video de demostración

- Tres tomas. La última (3:57) cubre: Dashboard vacío, Unidades y Codigarios, Nueva incidencia (materia y distribución en el paso 1), reemplazo, lista de incidencias, Dashboard con reemplazo activo, ficha de la incidencia, quitar reemplazo, Dashboard con cobertura 0 % y riesgo "Medio", y reporte de **módulos computables**.
- Pendientes menores: normalizar el audio (volumen medio -34 dB, algo bajo), recortar el final (~25 s quietos en el Dashboard en rojo), texto seleccionado en azul en la tabla del reporte, barra del navegador con extensiones.
- Limpieza de la demo: script `~/limpiar_demo.sql` en WSL (resetea las clases tocadas por incidencias y borra reemplazos e incidencias; no toca agentes, asignaciones, distribuciones ni períodos). Se corre con `PGPASSWORD=… psql -h localhost -p 5433 -U admin -d alnext_demo -f ~/limpiar_demo.sql`. Los `DICTADA` que reaparecen son clases de fechas pasadas resueltas solas por la app: es lo esperado.
- La demo está servida con `npm start` contra `alnext_demo`. **Volver a `gestor_horarios`** con `npm start` sin variables extra.

## 3. Tareas

- **Cerrada:** #282.
- **Abiertas relevantes:** #281 (SEC, quitar `DB USADA`), #278, #279, #280, UX-INC-021 (reintentar incidencia fallida con fechas editables / mensaje que liste fechas con clases; pendiente de elegir entre las dos ideas).
- **Seguridad P0/P1 antes de cargar datos reales:** #205, #206, #207, #217.
- **Deuda:** tests #167–#173, #247 (CUIT editable), #189, #191, UX-ADM #212–#216.
- **VirtualBox:** renombrar la instantánea "…primer instalación sin modificar" a "02-10 con Tailscale".

## 4. Mañana: actualizar la notebook de Ceferino

### 4.1 Llevar

- Pendrive **verificado** (hash comprobado después de expulsar y reenchufar) con el zip de fuentes v2: `alnext-fuentes.zip`, SHA256 `542E7AEE541F07976BE9EBBC22FC9F2F435B2B5C2044CEEEB83590AF3F2D3FB1`.
- No cambian dependencias ni schema (último cambio en `package.json`, lock y `prisma/`: 16/09, commit `9955f28`), así que **no hacen falta `npm ci` ni migraciones**.

### 4.2 Pasos (PowerShell como administrador en la notebook)

1. **Reconocer el terreno:** carpeta real del paquete (donde está `app`), `Test-Path .\app\.next`, y estado de la tarea `ALNEXT-App` (`Get-ScheduledTask`). Confirmar que `http://127.0.0.1:3000/public/login` responde 200 **antes** de tocar nada.
2. **Respaldo:** copiar la carpeta `app` actual a otro lugar (por ejemplo `app_respaldo_20261007`) antes de pisar, **sin** incluir `node_modules` si es muy pesada, pero conservando `.env`. Opcional: `pg_dump` de la base.
3. **Verificar el hash** del zip en la notebook (`Get-FileHash -Algorithm SHA256`).
4. `Expand-Archive` a una carpeta temporal y `robocopy <temporal> <paquete>\app /E /XD node_modules .next .git .claude backup_gestor_horarios docs tests installer /XF .env app-service.log check.ts codigarios-dump.json "backup_pre_migracion_20260706_2303.dump" estructura.txt "gestor_tmp@0.1.0" CLAUDE.md README.md Dockerfile vitest.config.ts` (sin `/MIR`). Comprobar `Test-Path <paquete>\app\features\incidencias\components\DistribucionResumen.tsx` y las líneas 66 y 89 de `app\lib\helpers\clases.ts`.
5. En PowerShell como administrador: `$env:Path = "C:\ALNEXT\node;" + $env:Path`, `Set-ExecutionPolicy Bypass -Scope Process -Force`, `cd <paquete>\installer`, `.\Install-AppService.ps1 -AppDir <paquete>\app`.
6. **Si el resultado es exit 6:** esperar 2 min y probar el login; no reinstalar. Si tras 3–4 min sigue sin responder, ver `app-service.log` (filtrando `DB USADA`) y el estado de la tarea.
7. Verificar: login, el wizard de Nueva incidencia (columnas Materia y Distribución) y que los datos reales de Ceferino sigan intactos.

### 4.3 Punto a decidir en el lugar: clases generadas con el bug

- Si Ceferino ya tiene un **período activo con clases generadas** antes del fix, esas clases pueden estar **corridas un día**. Hay que **revisar** (comparar el día de una clase conocida con el día de su módulo) antes de decidir cómo regenerarlas (por ejemplo cerrar y volver a activar el período, o corregir por consulta).
- Si todavía no hay período activo ni datos operativos reales, no hay nada que corregir: el siguiente período se genera bien.

### 4.4 Después de Ceferino

- Paquete **v4** = v3 + fuentes nuevos (para futuras instalaciones limpias), con hash verificado.
- Parte B de Ceferino: Tailscale + control de licencia; carga de datos operativos reales (guardar hostname y clave del rol remoto en el gestor de contraseñas).
- Cerrar #281 y las tareas de seguridad antes de cargar datos reales.