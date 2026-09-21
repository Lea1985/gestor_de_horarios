# Preflight.ps1
#
# Paso 1 del instalador único de ALNEXT (Windows nativo, sin Docker/WSL2).
# Antes de invocar el instalador oficial de PostgreSQL (EDB) hay que resolver
# tres cosas que, si se dejan pasar, cuelgan o corrompen la instalación:
#
#   1. Elevación: el instalador de Postgres tiene manifiesto requireAdministrator
#      y no hay forma de lanzarlo silenciosamente hacia un usuario sin privilegios.
#      Este script pide su propia elevación al principio (un solo UAC), en vez
#      de que aparezca a mitad de la instalación.
#   2. Puerto libre: el instalador de Postgres, si el puerto está ocupado,
#      muestra un diálogo gráfico bloqueante que se cuelga indefinidamente en
#      modo desatendido (validado en VM, ver docs/analisis-completo-instalador-alnext-2026-09-15.md
#      §3.3). Nunca hay que dejar que el instalador de Postgres lo detecte solo.
#   3. Instalación existente de la misma versión mayor: EDB registra las
#      instalaciones por versión mayor en el registro de Windows, no por los
#      parámetros que se le pasan. Si ya existe una instalación de esa versión,
#      el instalador oficial reutiliza/repara la existente ignorando puerto,
#      directorio y nombre de servicio nuevos -- o crashea (mismo doc, §3.4).
#      Este script solo detecta y reporta ese caso; decidir "reusar" vs
#      "abortar" es responsabilidad del paso de orquestación (no de este script).
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File installer\Preflight.ps1
#   powershell -ExecutionPolicy Bypass -File installer\Preflight.ps1 -PgPort 5433 -PgVersion 18
#   powershell -ExecutionPolicy Bypass -File installer\Preflight.ps1 -AllowExistingInstallation
#
# Salida:
#   - Resumen legible por consola (Write-Host).
#   - Un objeto JSON por el pipeline (última línea de salida "real"), pensado
#     para que un futuro script orquestador lo capture y parsee.
#   - Exit code:
#       0 = todo en orden, seguro continuar con la instalación de Postgres.
#       1 = no se pudo obtener elevación de administrador.
#       2 = el puerto candidato está ocupado.
#       3 = ya existe una instalación de esa versión mayor de Postgres
#           registrada en Windows (bloqueante salvo -AllowExistingInstallation).

param(
    [string]$PgVersion = "18",
    [int]$PgPort = 5433,
    [string]$ServiceName = "postgresql-alnext",
    [switch]$AllowExistingInstallation,
    [switch]$Elevated,
    [string]$ResultFile = ""
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "Common.ps1")

# --- 1. Elevación (Test-Elevado / Invoke-Elevado en Common.ps1) --------

if (-not (Test-Elevado)) {
    if ($Elevated) {
        # Ya se intentó relanzar una vez y seguimos sin elevación: no reintentar en loop.
        Write-Error "No se pudo obtener elevación de administrador tras el reintento." -ErrorAction Continue
        exit 1
    }

    Write-Host "ALNEXT necesita permisos de administrador para instalar PostgreSQL. Pidiendo elevación (UAC)..."

    $resultFile = Join-Path $env:TEMP "alnext-preflight-$([guid]::NewGuid().ToString('N')).json"

    $extraArgs = @(
        "-PgVersion", $PgVersion,
        "-PgPort", $PgPort,
        "-ServiceName", "`"$ServiceName`"",
        "-Elevated",
        "-ResultFile", "`"$resultFile`""
    )
    if ($AllowExistingInstallation) { $extraArgs += "-AllowExistingInstallation" }

    $relayResult = Invoke-Elevado -ScriptPath $PSCommandPath -ExtraArgs $extraArgs -ResultFile $resultFile
    if ($relayResult.Cancelado) {
        Write-Error "El usuario canceló la elevación (UAC) o esta falló: $($relayResult.Mensaje)" -ErrorAction Continue
        exit 1
    }
    if ($relayResult.Output) { $relayResult.Output }
    exit $relayResult.ExitCode
}

# A partir de acá el proceso corre elevado.

# --- 2. Puerto libre -----------------------------------------------------

function Test-PuertoLibre([int]$Port) {
    # Postgres termina escuchando en ambos wildcards (0.0.0.0 y ::), confirmado
    # con Get-NetTCPConnection en la VM de pruebas -- el puerto solo cuenta
    # como libre si se puede bindear en los dos stacks, IPv4 y IPv6.
    $listenerV4 = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
    try {
        $listenerV4.Start()
        $listenerV4.Stop()
    } catch [System.Net.Sockets.SocketException] {
        return $false
    }

    $listenerV6 = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::IPv6Any, $Port)
    try {
        $listenerV6.Start()
        $listenerV6.Stop()
    } catch [System.Net.Sockets.SocketException] {
        return $false
    }

    return $true
}

$portLibre = Test-PuertoLibre -Port $PgPort

# --- 3. Instalación existente de Postgres (misma versión mayor) ----------

$registryPath = "HKLM:\SOFTWARE\PostgreSQL\Installations\postgresql-x64-$PgVersion"
$instalacionExistente = Test-Path $registryPath

$servicioDefaultExistente = [bool](Get-Service -Name "postgresql-x64-$PgVersion" -ErrorAction SilentlyContinue)
$servicioPropioExistente = [bool](Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)

# --- Resumen y decisión ----------------------------------------------------

Write-Host ""
Write-Host "=== Preflight ALNEXT ==="
Write-Host "Elevación: OK (corriendo como administrador)"
Write-Host "Puerto $PgPort libre: $(if ($portLibre) { 'SI' } else { 'NO' })"
Write-Host "Instalación existente de Postgres $PgVersion (registro): $(if ($instalacionExistente) { 'SI -> ' + $registryPath } else { 'NO' })"
Write-Host "Servicio default 'postgresql-x64-$PgVersion' ya existe: $(if ($servicioDefaultExistente) { 'SI' } else { 'NO' })"
Write-Host "Servicio propio '$ServiceName' ya existe: $(if ($servicioPropioExistente) { 'SI' } else { 'NO' })"
Write-Host ""

$exitCode = 0
$reusoEsperado = ($instalacionExistente -or $servicioPropioExistente) -and $AllowExistingInstallation
if ((-not $portLibre) -and -not $reusoEsperado) {
    Write-Error "El puerto $PgPort está ocupado. Elegí otro puerto para la instancia de Postgres de ALNEXT." -ErrorAction Continue
    $exitCode = 2
} elseif (($instalacionExistente -or $servicioPropioExistente) -and -not $AllowExistingInstallation) {
    if ($instalacionExistente) {
        Write-Error "Ya existe una instalación de PostgreSQL $PgVersion registrada en Windows ($registryPath). El instalador oficial la reutilizaría/repararía en vez de crear la instancia propia de ALNEXT. Resolvé esto explícitamente (desinstalarla, usar otra versión mayor, o pasar -AllowExistingInstallation si ya decidiste reusarla) antes de continuar." -ErrorAction Continue
    }
    if ($servicioPropioExistente) {
        Write-Error "Ya existe un servicio de Windows llamado '$ServiceName' (posible resabio de un intento de instalación anterior). Resolvé esto explícitamente (eliminar el servicio, elegir otro nombre de servicio, o pasar -AllowExistingInstallation si ya decidiste reusarlo) antes de continuar." -ErrorAction Continue
    }
    $exitCode = 3
} elseif (-not $portLibre) {
    Write-Host "Puerto $PgPort ocupado, pero corresponde a la instalacion existente que se esta reusando (-AllowExistingInstallation). Continuando."
}

$resultado = [PSCustomObject]@{
    elevado                    = $true
    puertoSolicitado           = $PgPort
    puertoLibre                = $portLibre
    versionPostgresVerificada  = $PgVersion
    instalacionExistente       = $instalacionExistente
    rutaRegistroInstalacion    = if ($instalacionExistente) { $registryPath } else { $null }
    servicioDefaultExistente   = $servicioDefaultExistente
    nombreServicioSolicitado   = $ServiceName
    servicioPropioExistente    = $servicioPropioExistente
    allowExistingInstallation  = [bool]$AllowExistingInstallation
    listoParaContinuar         = ($exitCode -eq 0)
}

$json = $resultado | ConvertTo-Json -Compress
$json

if ($ResultFile) {
    $json | Out-File -FilePath $ResultFile -Encoding utf8
}

exit $exitCode
