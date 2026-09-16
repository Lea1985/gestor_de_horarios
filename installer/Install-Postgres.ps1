# Install-Postgres.ps1
#
# Paso 4 del instalador único de ALNEXT: orquesta la instalación silenciosa
# del PostgreSQL propio de ALNEXT (puerto/servicio/directorio exclusivos),
# usando el instalador oficial de EDB embebido, con espera activa real y
# verificación de resultado real (no el exit code del proceso que lo lanza).
#
# No duplica las verificaciones de installer/Preflight.ps1 (elevación,
# puerto libre, instalación existente): las consume invocando Preflight.ps1
# como proceso hijo real y decidiendo según su exit code + su JSON.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File installer\Install-Postgres.ps1 `
#       -PgInstallerPath "C:\ALNEXT\postgres-installer\postgresql-18.6-3-windows-x64.exe" `
#       -SuperPassword "unaClaveFuerte"
#
# Salida:
#   - Resumen legible por consola (Write-Host).
#   - Un objeto JSON por el pipeline (última línea de salida "real"), mismo
#     patrón que Preflight.ps1.
#   - Exit code:
#       0 = Postgres instalado (o reusado, ver -AllowExistingInstallation) y
#           verificado corriendo (servicio Running + puerto respondiendo).
#       1 = Preflight: sin elevación (no debería ocurrir -- este script ya
#           se asegura de estar elevado antes de invocar a Preflight).
#       2 = Preflight: el puerto solicitado está ocupado. No se tocó nada.
#       3 = Preflight: ya existe una instalación/servicio de esa versión
#           mayor y no se pasó -AllowExistingInstallation. No se invocó el
#           instalador de Postgres.
#       4 = Timeout: pasado -TimeoutMinutes, Postgres no quedó confirmado
#           corriendo (servicio Running + puerto respondiendo). Cubre tanto
#           "el instalador nunca terminó" como "terminó pero algo falló" --
#           no se puede distinguir de forma confiable desde afuera del
#           instalador de terceros, así que se reporta como un único
#           escenario de timeout en vez de intentar adivinar la causa.
#       6 = Fallo inesperado no controlado en la orquestación.
#
# -AllowExistingInstallation: si Preflight determinó que ya existe una
# instalación/servicio y aun así se pasó este flag, este script NUNCA
# reinvoca el instalador de Postgres sobre esa instalación -- se probó en
# VM (14/09/2026) que reinstalar la misma versión mayor puede reutilizar en
# silencio ignorando los parámetros nuevos, o crashear. En ese caso este
# script solo verifica que la instancia ya existente responda (mismo loop
# de verificación que para una instalación nueva).
#
# LIMITACIÓN CONOCIDA (no resuelta en esta iteración): el caso de reuso
# asume que la instalación/servicio detectado por Preflight ES la instancia
# de ALNEXT en $ServiceName/$PgPort (el escenario típico: se corrió este
# instalador antes en esta misma máquina). Preflight solo confirma
# existencia por versión mayor (clave de registro) y por nombre de
# servicio -- no lee el puerto ni la configuración real de esa instalación.
# Si existiera una instalación de Postgres 18 ajena a ALNEXT (otro nombre
# de servicio, otro puerto, de otro sistema de la escuela), este script
# verificaría igual contra $ServiceName/$PgPort y terminaría en timeout
# (exit 4) en vez de detectar esa instancia ajena. Requiere evidencia
# adicional de VM antes de resolverse (ver también los pendientes de
# Preflight.ps1: nombre de proceso a pollear, bind test IPv6).

param(
    [Parameter(Mandatory = $true)][string]$PgInstallerPath,
    [Parameter(Mandatory = $true)][string]$SuperPassword,
    [string]$ServicePassword = "",
    [string]$PgVersion = "18",
    [int]$PgPort = 5433,
    [string]$ServiceName = "postgresql-alnext",
    [string]$Prefix = "C:\ALNEXT\pgsql",
    [string]$DataDir = "$Prefix\data",
    [switch]$AllowExistingInstallation,
    [int]$TimeoutMinutes = 15,
    [string]$DebugTraceLog = "",
    [switch]$Elevated,
    [string]$ResultFile = ""
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "Common.ps1")

# Mismo valor para ambas contraseñas si no se especifica una de servicio
# aparte -- es lo que se validó en la VM el 14/09/2026. Pendiente de
# hardening a futuro (separar credencial de servicio de Windows vs.
# password de superusuario Postgres), no bloqueante para el piloto.
if (-not $ServicePassword) { $ServicePassword = $SuperPassword }

# --- 0. Elevación propia (necesaria: este script invoca al instalador de
# Postgres, que exige admin) -- reutiliza Common.ps1, no reimplementa nada.

if (-not (Test-Elevado)) {
    if ($Elevated) {
        Write-Error "No se pudo obtener elevación de administrador tras el reintento." -ErrorAction Continue
        exit 1
    }

    Write-Host "ALNEXT necesita permisos de administrador para instalar PostgreSQL. Pidiendo elevación (UAC)..."

    $resultFile = Join-Path $env:TEMP "alnext-install-postgres-$([guid]::NewGuid().ToString('N')).json"

    $extraArgs = @(
        "-PgInstallerPath", "`"$PgInstallerPath`"",
        "-SuperPassword", "`"$SuperPassword`"",
        "-ServicePassword", "`"$ServicePassword`"",
        "-PgVersion", $PgVersion,
        "-PgPort", $PgPort,
        "-ServiceName", "`"$ServiceName`"",
        "-Prefix", "`"$Prefix`"",
        "-DataDir", "`"$DataDir`"",
        "-TimeoutMinutes", $TimeoutMinutes,
        "-Elevated",
        "-ResultFile", "`"$resultFile`""
    )
    if ($AllowExistingInstallation) { $extraArgs += "-AllowExistingInstallation" }
    if ($DebugTraceLog) { $extraArgs += @("-DebugTraceLog", "`"$DebugTraceLog`"") }

    $relayResult = Invoke-Elevado -ScriptPath $PSCommandPath -ExtraArgs $extraArgs -ResultFile $resultFile
    if ($relayResult.Cancelado) {
        Write-Error "El usuario canceló la elevación (UAC) o esta falló: $($relayResult.Mensaje)" -ErrorAction Continue
        exit 1
    }
    if ($relayResult.Output) { $relayResult.Output }
    exit $relayResult.ExitCode
}

# A partir de acá el proceso corre elevado.

function Test-PostgresListo {
    param([string]$ServiceName, [int]$Port)

    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $svc -or $svc.Status -ne "Running") { return $false }

    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $Port)
        $conectado = $client.Connected
        $client.Close()
        return $conectado
    } catch {
        return $false
    }
}

$reused = $false
$instaladorInvocado = $false
$listo = $false
$preflightExit = -1
$preflightJson = $null

try {
    # --- 1. Preflight, como proceso hijo real (NUNCA dot-source/& en este
    # mismo proceso: Preflight.ps1 termina con "exit", que mataría también
    # a este proceso si no corriera como un powershell.exe separado).

    Write-Host ""
    Write-Host "=== Instalación de PostgreSQL para ALNEXT ==="
    Write-Host "Ejecutando preflight..."

    $preflightScript = Join-Path $PSScriptRoot "Preflight.ps1"
    $preflightArgs = @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $preflightScript,
        "-PgVersion", $PgVersion,
        "-PgPort", $PgPort,
        "-ServiceName", $ServiceName
    )
    if ($AllowExistingInstallation) { $preflightArgs += "-AllowExistingInstallation" }

    $preflightRaw = & powershell.exe @preflightArgs
    $preflightExit = $LASTEXITCODE

    if ($preflightRaw) {
        try { $preflightJson = ($preflightRaw -join "`n") | ConvertFrom-Json } catch { $preflightJson = $null }
    }

    $preflightJsonInvalido = $false

    if ($preflightExit -eq 0) {
        if (-not $preflightJson) {
            # Preflight salió con 0 (éxito) pero no pudimos interpretar su JSON.
            # No asumir "no existe nada, instalar limpio" -- tratar como fallo
            # inesperado, no como vía libre.
            $preflightJsonInvalido = $true
            Write-Host "Preflight terminó con éxito (exit 0) pero no se pudo interpretar su salida JSON -- no se puede confirmar de forma segura si ya existe una instalación previa. Abortando sin invocar el instalador."
        } elseif ($preflightJson.instalacionExistente -or $preflightJson.servicioPropioExistente) {
            $reused = $true
            Write-Host "Preflight confirmó una instalación/servicio de Postgres ya existente, reuso autorizado (-AllowExistingInstallation). No se va a reinvocar el instalador -- reinstalar la misma versión mayor puede reutilizar en silencio ignorando los parámetros nuevos, o crashear (validado en VM, 14/09/2026). Se pasa directo a verificar que la instancia existente responda."
        } else {
            $installerArgs = @(
                "--mode", "unattended",
                "--unattendedmodeui", "none",
                "--superpassword", "`"$SuperPassword`"",
                "--servicename", "`"$ServiceName`"",
                "--servicepassword", "`"$ServicePassword`"",
                "--serverport", $PgPort,
                "--prefix", "`"$Prefix`"",
                "--datadir", "`"$DataDir`""
            )
            if ($DebugTraceLog) { $installerArgs += @("--debugtrace", "`"$DebugTraceLog`"") }

            Write-Host "Invocando el instalador de PostgreSQL ($PgInstallerPath)..."
            $installerProc = Start-Process -FilePath $PgInstallerPath -ArgumentList $installerArgs -PassThru
            $instaladorInvocado = $true
            Write-Host "El instalador devolvió el control (PID $($installerProc.Id)); el trabajo real de EDB sigue en segundo plano varios minutos (observado 7-10 min en VM). No se asume éxito ni fallo por esto."
        }

        if (-not $preflightJsonInvalido) {
            Write-Host "Esperando verificación real (servicio '$ServiceName' Running + puerto $PgPort respondiendo), timeout $TimeoutMinutes min..."
            $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
            while ((Get-Date) -lt $deadline) {
                if (Test-PostgresListo -ServiceName $ServiceName -Port $PgPort) {
                    $listo = $true
                    break
                }
                Start-Sleep -Seconds 5
            }
        }
    }

    $exitCode = 0
    if ($preflightExit -eq 2) {
        Write-Error "Preflight detectó el puerto $PgPort ocupado. Abortando sin invocar el instalador de Postgres." -ErrorAction Continue
        $exitCode = 2
    } elseif ($preflightExit -eq 3) {
        Write-Error "Preflight detectó una instalación/servicio de Postgres existente sin -AllowExistingInstallation. Abortando sin invocar el instalador." -ErrorAction Continue
        $exitCode = 3
    } elseif ($preflightExit -eq 1) {
        Write-Error "Preflight no pudo confirmar elevación (inesperado: este script ya se aseguró de estar elevado antes de invocarlo)." -ErrorAction Continue
        $exitCode = 1
    } elseif ($preflightExit -ne 0) {
        Write-Error "Preflight terminó con un código inesperado ($preflightExit)." -ErrorAction Continue
        $exitCode = 6
    } elseif ($preflightJsonInvalido) {
        Write-Error "No se pudo interpretar la salida JSON de Preflight pese a exit code 0. Tratado como fallo inesperado, no como instalación limpia." -ErrorAction Continue
        $exitCode = 6
    } elseif (-not $listo) {
        Write-Error "Postgres no quedó confirmado corriendo (servicio Running + puerto $PgPort respondiendo) dentro de $TimeoutMinutes minutos." -ErrorAction Continue
        $exitCode = 4
    }

    Write-Host ""
    Write-Host "=== Resultado ==="
    Write-Host "Preflight exit code: $preflightExit"
    Write-Host "Instalación reusada (sin reinvocar instalador): $(if ($reused) { 'SI' } else { 'NO' })"
    Write-Host "Instalador de Postgres invocado: $(if ($instaladorInvocado) { 'SI' } else { 'NO' })"
    Write-Host "Postgres confirmado corriendo: $(if ($listo) { 'SI' } else { 'NO' })"
    Write-Host ""

    $resultado = [PSCustomObject]@{
        elevado                   = $true
        preflightExitCode         = $preflightExit
        puertoSolicitado          = $PgPort
        servicioSolicitado        = $ServiceName
        reusoInstalacionExistente = $reused
        instaladorInvocado        = $instaladorInvocado
        preflightJsonInvalido     = $preflightJsonInvalido
        postgresListo             = $listo
        timeoutMinutos            = $TimeoutMinutes
        exitCode                  = $exitCode
    }

    $json = $resultado | ConvertTo-Json
    $json

    if ($ResultFile) {
        $json | Out-File -FilePath $ResultFile -Encoding utf8
    }

    exit $exitCode
} catch {
    Write-Error "Fallo inesperado en la orquestación de Install-Postgres.ps1: $($_.Exception.Message)" -ErrorAction Continue

    $resultado = [PSCustomObject]@{
        elevado                   = $true
        preflightExitCode         = $preflightExit
        reusoInstalacionExistente = $reused
        instaladorInvocado        = $instaladorInvocado
        postgresListo             = $listo
        exitCode                  = 6
        error                     = $_.Exception.Message
    }

    $json = $resultado | ConvertTo-Json
    $json

    if ($ResultFile) {
        $json | Out-File -FilePath $ResultFile -Encoding utf8
    }

    exit 6
}
