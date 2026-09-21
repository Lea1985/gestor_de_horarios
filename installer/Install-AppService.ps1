# Install-AppService.ps1
#
# Paso 6 del instalador unico de ALNEXT: deja la app corriendo de forma
# persistente (sobrevive un reinicio de Windows, se reinicia sola si se cae),
# escuchando solo en loopback (127.0.0.1) -- coherente con el alcance ya
# definido del piloto: una sola maquina, sin exposicion de red.
#
# Que hace:
#   1. Resuelve node.exe (PATH primero, fallback a la ruta default de la
#      instalacion oficial de Node.js).
#   2. Corre "next build" (invocado directo via node, sin pasar por
#      npm.cmd) -- el script es autosuficiente, no asume que ya corriste
#      el build a mano.
#   3. Si el puerto de destino ya esta ocupado: si es por un proceso
#      node.exe (tipicamente una corrida manual de prueba anterior), lo
#      detiene; si es por cualquier otro proceso, corta con error sin
#      tocarlo.
#   4. Genera un wrapper .bat que invoca next start y redirige su salida
#      a un log dentro de -AppDir (util para diagnostico -- Task
#      Scheduler no expone la salida de una tarea SYSTEM de otra forma).
#   5. Da de baja la tarea programada si ya existia (no hay secreto que
#      perder ahi, a diferencia del rol de Postgres) y la recrea:
#      disparador "al iniciar Windows", corre como SYSTEM (sin depender
#      de sesion de usuario), con reintento automatico si falla, y
#      -AllowStartIfOnBatteries/-DontStopIfGoingOnBatteries -- SIN esto
#      la tarea queda encolada para siempre y nunca llega a ejecutar
#      nada, sin ningun error visible, si Windows detecta una bateria
#      (confirmado en VM: VirtualBox expone una bateria ACPI virtual
#      incluso en una maquina pensada como servidor).
#   6. Inicia la tarea y espera (con reintentos) a que la app responda
#      antes de reportar exito.
#
# Se auto-eleva UNA sola vez al principio (mismo patron Test-Elevado/
# Invoke-Elevado de Common.ps1 que ya usan Preflight.ps1/Install-Postgres.ps1/
# Install-ALNEXT.ps1): registrar una tarea que corre como SYSTEM no funciona
# desde una consola sin elevar (confirmado en VM: "Acceso denegado"). Antes
# este script dependia de que el operador abriera la consola ya como
# Administrador; ahora pide su propio UAC si hace falta, tanto si se invoca
# suelto como si ya viene elevado (via el orquestador, en cuyo caso
# Test-Elevado ya da true y el bloque de abajo se saltea sin pedir nada).
#
# No usa npm start ni npm run build -- invoca next directo via node.exe,
# mismo criterio ya usado en Install-Database.ps1 para el seed (evita la
# capa de npm.cmd/PATH bajo contextos no interactivos).
#
# Supuesto (documentado, no resuelto aca): el codigo de la app y sus
# dependencias (node_modules) ya estan en -AppDir -- mismo supuesto que
# Install-Database.ps1.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File installer\Install-AppService.ps1
#
# Salida:
#   - Resumen legible por consola (Write-Host).
#   - Un objeto JSON por el pipeline (ultima linea de salida "real"),
#     mismo patron que los pasos anteriores del instalador.
#   - Exit code:
#       0 = build, registro de tarea e inicio de la app OK, respondiendo.
#       1 = parametros invalidos (-AppDir inexistente, o no se encontro
#           next dentro de node_modules -- dependencias no instaladas).
#       2 = no se encontro node.exe.
#       3 = el puerto de destino esta ocupado por un proceso que no es
#           node.exe -- no se toca, hay que liberarlo a mano.
#       4 = "next build" termino con error.
#       5 = fallo el registro o el inicio de la tarea programada.
#       6 = la tarea arranco pero la app no respondio a tiempo -- revisar
#           el log en -AppDir\app-service.log.
#       7 = no se pudo obtener elevacion de administrador (UAC cancelado
#           o fallido). Codigo separado del 1 a proposito, para no hacer
#           que un mismo numero signifique dos errores sin relacion
#           dentro de este script.
#       8 = fallo inesperado no controlado.

param(
    [string]$AppDir = "C:\ALNEXT\app",
    [int]$Port = 3000,
    [string]$TaskName = "ALNEXT-App",
    [switch]$Elevated,
    [string]$ResultFile = ""
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "Common.ps1")

function Salir {
    param([int]$Code, [string]$MensajeError = "")

    if ($MensajeError) {
        Write-Error $MensajeError -ErrorAction Continue
    }

    $resultado.exitCode = $Code
    $json = $resultado | ConvertTo-Json -Compress
    $json

    if ($ResultFile) {
        $json | Out-File -FilePath $ResultFile -Encoding utf8
    }

    exit $Code
}

$resultado = [ordered]@{
    appDir            = $AppDir
    port              = $Port
    taskName          = $TaskName
    nodeExe           = $null
    buildOk           = $false
    tareaRegistrada   = $false
    tareaIniciada     = $false
    appRespondiendo   = $false
    logPath           = $null
    exitCode          = -1
}

# --- 0. Elevacion (Test-Elevado / Invoke-Elevado en Common.ps1) ------------
# Registrar una tarea programada que corre como SYSTEM requiere consola
# elevada. Si este script ya corre como hijo de un proceso elevado (caso
# orquestador: Install-ALNEXT.ps1 ya pidio UAC una vez), Test-Elevado da
# true y este bloque entero se saltea sin pedir nada de nuevo.

if (-not (Test-Elevado)) {
    if ($Elevated) {
        Salir -Code 7 -MensajeError "No se pudo obtener elevacion de administrador tras el reintento."
    }

    Write-Host "Registrar la tarea programada de ALNEXT requiere permisos de administrador. Pidiendo elevacion (UAC)..."

    $resultFileRelay = Join-Path $env:TEMP "alnext-appservice-$([guid]::NewGuid().ToString('N')).json"

    $extraArgs = @(
        "-AppDir", "`"$AppDir`"",
        "-Port", $Port,
        "-TaskName", "`"$TaskName`"",
        "-Elevated",
        "-ResultFile", "`"$resultFileRelay`""
    )

    $relayResult = Invoke-Elevado -ScriptPath $PSCommandPath -ExtraArgs $extraArgs -ResultFile $resultFileRelay
    if ($relayResult.Cancelado) {
        Salir -Code 7 -MensajeError "El usuario cancelo la elevacion (UAC) o esta fallo: $($relayResult.Mensaje)"
    }
    if ($relayResult.Output) { $relayResult.Output }
    exit $relayResult.ExitCode
}

# A partir de aca el proceso corre elevado.

# Si hay una copia portable de Node.js en C:\ALNEXT\node (paquete offline,
# ver backlog #248), la antepone al PATH de este proceso -- despues del
# bloque de elevacion (no antes, se perderia en el relanzamiento UAC).
# Este script ya resuelve $nodeExe explicitamente mas abajo (PATH o
# fallback a C:\Program Files\nodejs), asi que esto amplia esa cadena de
# resolucion sin tocarla.
Add-NodePortableAlPath

try {
    Write-Host ""
    Write-Host "=== Arranque persistente de la app ALNEXT (Paso 6) ==="

    # --- 1. Validaciones de entrada -----------------------------------------

    if (-not (Test-Path $AppDir)) {
        Salir -Code 1 -MensajeError "No existe -AppDir: $AppDir"
    }
    $nextBin = Join-Path $AppDir "node_modules\next\dist\bin\next"
    if (-not (Test-Path $nextBin)) {
        Salir -Code 1 -MensajeError "No se encontro $nextBin -- dependencias no instaladas? Corriste npm install en -AppDir?"
    }

    # --- 2. Resolver node.exe (PATH primero, fallback a la ruta default) ---

    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) {
        $nodeExe = $cmd.Source
    } else {
        $nodeExe = "C:\Program Files\nodejs\node.exe"
    }
    if (-not (Test-Path $nodeExe)) {
        Salir -Code 2 -MensajeError "No se encontro node.exe en: $nodeExe"
    }
    $resultado.nodeExe = $nodeExe
    Write-Host "node.exe: $nodeExe"

    # --- 3. Build de produccion ------------------------------------------------

    Write-Host "Corriendo next build..."
    & $nodeExe $nextBin build $AppDir
    if ($LASTEXITCODE -ne 0) {
        Salir -Code 4 -MensajeError "next build termino con exit code $LASTEXITCODE."
    }
    $resultado.buildOk = $true
    Write-Host "Build OK."

    # --- 4. Puerto ocupado? -----------------------------------------------------

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $ownerPid = $conn[0].OwningProcess
        $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq "node") {
            Write-Host "Puerto $Port ocupado por un proceso node.exe (PID $ownerPid) -- probablemente una corrida manual anterior. Deteniendolo."
            Stop-Process -Id $ownerPid -Force
            Start-Sleep -Seconds 1
        } else {
            $nombreProceso = if ($proc) { $proc.ProcessName } else { "desconocido" }
            Salir -Code 3 -MensajeError "El puerto $Port ya esta en uso por un proceso distinto de node.exe (PID $ownerPid, proceso: $nombreProceso). Liberalo antes de continuar."
        }
    }

    # --- 5. Generar wrapper .bat (captura salida a un log, Task Scheduler no
    #        expone stdout/stderr de una tarea SYSTEM de otra forma) --------

    $logPath = Join-Path $AppDir "app-service.log"
    $batPath = Join-Path $AppDir "run-app-service.bat"
    $resultado.logPath = $logPath

    $batContent = "@echo off`r`ncd /d `"$AppDir`"`r`n`"$nodeExe`" `"$nextBin`" start `"$AppDir`" -H 127.0.0.1 -p $Port >> `"$logPath`" 2>&1`r`n"
    [System.IO.File]::WriteAllText($batPath, $batContent, [System.Text.Encoding]::ASCII)

    # --- 6. Registrar tarea programada (idempotente: reemplaza si existia) ---

    $existente = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existente) {
        Write-Host "La tarea '$TaskName' ya existia -- deteniendola y reemplazandola."
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    $accion = New-ScheduledTaskAction -Execute "$env:WINDIR\System32\cmd.exe" -Argument "/c `"$batPath`"" -WorkingDirectory $AppDir
    $disparador = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    # -AllowStartIfOnBatteries / -DontStopIfGoingOnBatteries: sin esto la
    # tarea queda "Queued" para siempre y nunca ejecuta nada -- confirmado
    # en VM, VirtualBox expone una bateria ACPI virtual incluso en una
    # maquina pensada como servidor, y el default de Task Scheduler es no
    # arrancar si "esta con bateria".
    $configuracion = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

    try {
        Register-ScheduledTask -TaskName $TaskName -Action $accion -Trigger $disparador -Principal $principal -Settings $configuracion -Force | Out-Null
        $resultado.tareaRegistrada = $true
        Write-Host "Tarea '$TaskName' registrada (disparador: al iniciar Windows, corre como SYSTEM)."
    } catch {
        Salir -Code 5 -MensajeError "Fallo el registro de la tarea programada -- $($_.Exception.Message)"
    }

    # --- 7. Iniciar la tarea ahora (no esperar al proximo reinicio) ---------

    try {
        Start-ScheduledTask -TaskName $TaskName
        $resultado.tareaIniciada = $true
        Write-Host "Tarea iniciada."
    } catch {
        Salir -Code 5 -MensajeError "Fallo el inicio de la tarea programada -- $($_.Exception.Message)"
    }

    # --- 8. Esperar a que la app responda ---------------------------------------

    # Nota: 60 intentos de 1s (60s totales), no 15 -- confirmado en VM que
    # un arranque via Task Scheduler/SYSTEM justo despues de un "next
    # build" propio de este mismo script puede tardar mas de 15s en
    # responder (el build deja la VM con menos margen), aunque la app
    # termine arrancando bien (confirmado con Invoke-WebRequest manual
    # mientras el script ya habia reportado "exitCode:6" -- la tarea
    # seguia corriendo y respondiendo 200 igual, solo que mas tarde de lo
    # que este script esperaba).
    Write-Host "Esperando a que la app responda en http://127.0.0.1:$Port ..."
    $ok = $false
    $maxIntentos = 60
    for ($i = 0; $i -lt $maxIntentos; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) {
                $ok = $true
                break
            }
        } catch {
            # todavia no esta arriba, seguir esperando
        }
        if (($i + 1) % 10 -eq 0) {
            Write-Host "  ... $($i + 1)s esperando, todavia sin respuesta."
        }
    }

    if (-not $ok) {
        Salir -Code 6 -MensajeError "La tarea arranco pero la app no respondio en http://127.0.0.1:$Port dentro de $maxIntentos segundos. Revisar el log: $logPath"
    }
    $resultado.appRespondiendo = $true
    Write-Host "App respondiendo OK."

    Write-Host ""
    Write-Host "=== Resultado ==="
    Write-Host "Tarea: $TaskName (al iniciar Windows, SYSTEM, reintento automatico)"
    Write-Host "App disponible en: http://127.0.0.1:$Port"
    Write-Host "Log: $logPath"
    Write-Host ""

    Salir -Code 0
} catch {
    Salir -Code 8 -MensajeError "Fallo inesperado no controlado en Install-AppService.ps1: $($_.Exception.Message)"
}
