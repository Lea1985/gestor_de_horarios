# Punto de partida — cierre de sesión 03/10/2026

## 1. Resumen del día

Objetivo: consolidar la documentación de instalación en una única guía reutilizable, y usarla para hacer **la primera instalación real de ALNEXT en una institución piloto** (Colegio Ceferino).

**Resultado: éxito — primera instalación de producción completa y validada.**

### 1.1 Guía de instalación consolidada

Se redactó `guia-instalacion-alnext.md`, que unifica en un solo documento:

- **Parte A** — instalación offline de ALNEXT (del cierre del 25/09): verificación de hash, descompresión, mover `node/` a `C:\ALNEXT\node`, habilitar ejecución de scripts, correr `Install-ALNEXT.ps1`, manejo de reintentos, verificación visual.
- **Parte B** — acceso remoto y control de licencia vía Tailscale (del cierre del 02/10): prerrequisitos de la PC de Leandro, generar authkey, `Install-Tailscale.ps1`, `Configure-AccesoRemoto.ps1`, validación de suspensión/reactivación con `Set-EstadoInstitucion.ps1`.
- Un checklist resumido para copiar/pegar en cada instalación nueva.
- Nota sobre el bug de corrupción en transferencias USB desde VirtualBox (copiar a mano por Explorador, no con `Copy-Item`/`robocopy`).

Esta guía reemplaza la necesidad de cruzar los dos documentos de cierre de sesión anteriores para instalar en una máquina nueva.

### 1.2 Primera instalación real — Colegio Ceferino (Nva. Esc. Ceferino Namuncura 3164)

Instalación hecha directamente en la PC de Leandro (no en una VM de prueba), siguiendo la Parte A de la guía con el paquete `ALNEXT-paquete-offline-v3.zip` (el mismo del 25/09, ya en el escritorio desde esa sesión).

**Pasos ejecutados:**

1. Verificación de hash del zip ya presente en el escritorio → coincidió con el de referencia (`FD5DDC39...`), confirmando que seguía íntegro desde el 25/09.
2. Descompresión → las 6 entradas esperadas (`app`, `installer`, `node`, `postgres-installer`, `tailscale-installer`, `check.sql`).
3. `node/` movido a `C:\ALNEXT\node` vía `robocopy` (465 directorios, 1989 archivos, 101.19 MB, ~11s) → `node.exe` y `npx.cmd` confirmados.
4. `Set-ExecutionPolicy Bypass -Scope Process -Force`.
5. Confirmado el nombre real del instalador de Postgres: `postgresql-18.6-4-windows-x64.exe`.
6. `Install-ALNEXT.ps1` corrido con los datos **reales** de la institución:
   - Institución: "Nva. Esc. Ceferino Namuncura 3164", CUIT 30-70-879524-7, email `secretaria3164@colegioceferino.edu.ar`
   - Admin: Leandro Andres Alegre, mismo email, contraseña real
   - Auto-elevación por UAC, sin intervención manual adicional

**Resultado final:**
```json
{"preflightOk":true,"postgresOk":true,"databaseOk":true,"appServiceOk":true,"exitCode":0}
```

Login verificado en `http://127.0.0.1:3000/public/login` con las credenciales reales del admin — Dashboard cargó correctamente.

**Verificación adicional importante**: se confirmó que la instalación **no interfirió** con el funcionamiento de otras aplicaciones ya instaladas en esa misma máquina — validación clave dado que se instaló Postgres (puerto 5433, separado de cualquier instancia previa) y Node.js portátil en rutas propias de ALNEXT, sin tocar configuración global del sistema.

### 1.3 Acceso directo en el escritorio

Se intentó crear un acceso directo "como app" desde Chrome (Más herramientas → Crear acceso directo), pero esa opción no apareció en el menú desplegado (varía según versión de Chrome). Se resolvió con un acceso directo `.url` simple vía PowerShell, apuntando a `http://127.0.0.1:3000/public/login`:

```powershell
$shortcut = New-Object -ComObject WScript.Shell
$link = $shortcut.CreateShortcut("C:\Users\leand\Desktop\ALNEXT.url")
$link.TargetPath = "http://127.0.0.1:3000/public/login"
$link.Save()
```

Queda pendiente, si se quiere una experiencia más prolija para la secretaria (sin barra de direcciones ni pestañas), probar el ícono de instalación (⊕) en la barra de direcciones de Chrome/Edge parado en la página de login.

### 1.4 Prueba de arranque en frío (apagado/encendido completo)

Se apagó y volvió a encender la PC completa (no solo reinicio) para validar que la Tarea Programada `ALNEXT-App` arranca sola sin intervención manual. **Resultado: funcionó perfecto.** Se confirmó que, tras el encendido, hay una demora esperable de hasta un par de minutos antes de que la app responda — por la cadena de arranque (Windows bootea → Programador de Tareas dispara `ALNEXT-App` → el servicio de Postgres `postgresql-alnext` necesita estar listo → recién ahí Next.js levanta el servidor en el puerto 3000). No es un problema, es el comportamiento esperado del Paso 4 del instalador.

### 1.5 Cierre de tarea

- Tarea #11 ("Cargar datos reales de Colegio Ceferino vía mecanismo de config del instalador") → **completada**. El seed de instalación (`seed-instalacion.ts`, invocado automáticamente por `Install-Database.ps1` dentro del orquestador) cargó la institución y el admin reales directamente desde los parámetros pasados a `Install-ALNEXT.ps1`.

## 2. Estado de tareas cerradas hoy

- #11 — Cargar datos reales de Colegio Ceferino (escuela piloto confirmada) vía mecanismo de config del instalador → **completada**

## 3. Pendientes para la próxima sesión

- **Parte B de la guía (Tailscale + control de licencia) todavía no se corrió en esta máquina real de Colegio Ceferino** — solo se validó en la VM de pruebas el 02/10. Es el siguiente paso lógico: generar un authkey para esta institución, correr `Install-Tailscale.ps1` y `Configure-AccesoRemoto.ps1` ahí, y validar suspensión/reactivación como se hizo en la VM.
- Cargar los datos operativos reales de la escuela (turnos, unidades, agentes, módulos horarios, período operativo, catálogo de codigario) desde la UI, ya logueado como admin — es el paso que indica el propio mensaje final del seed de instalación.
- Guardar el hostname de Tailscale y la contraseña del rol remoto de esta institución en el gestor de contraseñas, una vez corrida la Parte B.
- Deuda técnica ya identificada y sin tocar: auditoría de 45 tests desactualizados (#167-173), ítems P0 de seguridad en administración de usuarios (#205, #206, #207, #217), CUIT editable (#247).
- Terminar de grabar y editar el video de demostración funcional (guión armado el 02/10, quedó pendiente la escena final de incidencia + reporte de horas sobre la base `alnext_demo`).