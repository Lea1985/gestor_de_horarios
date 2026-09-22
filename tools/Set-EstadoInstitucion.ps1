# Set-EstadoInstitucion.ps1
#
# Herramienta INTERNA para Leandro -- NO forma parte del instalador ni se
# distribuye a las instituciones. Corre desde tu propia PC (con Tailscale
# instalado ahi), conectandose a la VM de una institucion instalada via
# Tailscale (hostname MagicDNS o IP), para activar o suspender su acceso
# cambiando Institucion.activo -- el flag que proxy.ts ya verifica en cada
# request antes de dejar pasar cualquier operacion de la API (ver #204).
#
# Requiere que esa VM ya haya corrido Configure-AccesoRemoto.ps1.
#
# Uso (suspender por falta de pago):
#   .\Set-EstadoInstitucion.ps1 -TailscaleHost alnext-vm-colegio-ceferino -RemoteAdminPassword "..." -Activo:$false
#
# Uso (reactivar):
#   .\Set-EstadoInstitucion.ps1 -TailscaleHost alnext-vm-colegio-ceferino -RemoteAdminPassword "..." -Activo:$true
#
# Exit codes:
#   0 = cambio aplicado y verificado.
#   1 = psql no encontrado.
#   2 = fallo de conexion o de consulta/actualizacion.
#   3 = el usuario cancelo la confirmacion.

param(
    [Parameter(Mandatory = $true)][string]$TailscaleHost,
    [Parameter(Mandatory = $true)][string]$RemoteAdminPassword,
    [Parameter(Mandatory = $true)][bool]$Activo,
    [int]$PgPort = 5433,
    [string]$AppDbName = "alnext",
    [string]$PsqlPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $PsqlPath) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        $PsqlPath = $cmd.Source
    } else {
        Write-Error "No se encontro psql.exe en el PATH. Instala el cliente de PostgreSQL en tu PC o pasa -PsqlPath." -ErrorAction Continue
        exit 1
    }
}

function Invocar-Sql {
    param([string]$Sql)
    $sqlPath = Join-Path $env:TEMP "alnext-set-estado-$([guid]::NewGuid().ToString('N')).sql"
    Set-Content -Path $sqlPath -Value $Sql -Encoding ASCII
    $env:PGPASSWORD = $RemoteAdminPassword
    $salida = (cmd /c "`"$PsqlPath`" -h $TailscaleHost -p $PgPort -U alnext_remote_admin -d $AppDbName -v ON_ERROR_STOP=1 -f `"$sqlPath`" 2>&1") | Out-String
    $codigo = $LASTEXITCODE
    $env:PGPASSWORD = $null
    Remove-Item $sqlPath -ErrorAction SilentlyContinue
    return [PSCustomObject]@{ Salida = $salida; Codigo = $codigo }
}

$sqlConsulta = "SELECT id, nombre, cuit, activo FROM `"Institucion`";"

Write-Host "Estado actual (conectando a $TailscaleHost):"
$r1 = Invocar-Sql -Sql $sqlConsulta
Write-Host $r1.Salida
if ($r1.Codigo -ne 0) {
    Write-Error "No se pudo conectar o consultar. Revisa TailscaleHost/password, y que Configure-AccesoRemoto.ps1 ya haya corrido en esa VM." -ErrorAction Continue
    exit 2
}

$destino = if ($Activo) { "ACTIVADA" } else { "SUSPENDIDA" }
$confirmacion = Read-Host "Confirmar: la institucion de arriba queda $destino. Escribi 'si' para continuar"
if ($confirmacion -ne "si") {
    Write-Host "Cancelado, no se aplico ningun cambio."
    exit 3
}

$valorSql = if ($Activo) { "true" } else { "false" }
$r2 = Invocar-Sql -Sql "UPDATE `"Institucion`" SET activo = $valorSql;"
Write-Host $r2.Salida

Write-Host "Estado despues del cambio:"
$r3 = Invocar-Sql -Sql $sqlConsulta
Write-Host $r3.Salida

if ($r2.Codigo -ne 0) {
    Write-Error "El UPDATE fallo. Ver detalle arriba." -ErrorAction Continue
    exit 2
}

Write-Host "Listo: institucion $destino."
exit 0
