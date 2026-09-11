# restaurar-alnext.ps1
#
# Restauración de un backup de ALNEXT generado por backup-alnext.ps1.
# DESTRUCTIVO: borra por completo la base de destino y la recrea a partir
# del archivo de backup. Pide confirmación explícita (escribir el nombre
# exacto de la base) antes de tocar nada -- no hay "deshacer".
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File restaurar-alnext.ps1 `
#       -BackupFile "C:\ruta\backups\alnext_backup_2026-09-10_16-15-48.sql" `
#       -DatabaseUrl "postgresql://postgres:admin123@localhost:5432/gestor_prueba_backup"
#
# Si no se pasa -DatabaseUrl, lee DATABASE_URL del .env del proyecto (mismo
# criterio que backup-alnext.ps1), para uso normal contra la base real.

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [string]$DatabaseUrl = "",
    [string]$EnvFile     = "$PSScriptRoot\..\.env",
    [string]$PsqlPath    = ""
)

$ErrorActionPreference = "Stop"

# 1. Validar que el backup existe
if (-not (Test-Path $BackupFile)) {
    Write-Error "No se encontró el archivo de backup: $BackupFile"
    exit 1
}

# 2. Resolver la connection string (mismo criterio que backup-alnext.ps1)
if (-not $DatabaseUrl) {
    if (-not (Test-Path $EnvFile)) {
        Write-Error "No se encontró el archivo .env en: $EnvFile (o pasá -DatabaseUrl directamente)"
        exit 1
    }
    $envLine = Get-Content $EnvFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
    if (-not $envLine) {
        Write-Error "No se encontró DATABASE_URL en $EnvFile"
        exit 1
    }
    $DatabaseUrl = ($envLine -split '=', 2)[1].Trim('"')
}

# 3. Parsear la connection string: postgresql://usuario:password@host:puerto/basededatos
if ($DatabaseUrl -notmatch '^postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)') {
    Write-Error "No se pudo interpretar DatabaseUrl. Formato esperado: postgresql://usuario:password@host:puerto/basededatos"
    exit 1
}
$dbUser = $Matches[1]
$dbPass = $Matches[2]
$dbHost = $Matches[3]
$dbPort = $Matches[4]
$dbName = $Matches[5]

# URL de "mantenimiento": misma conexión pero a la base "postgres", para poder
# borrar/crear la base de destino (no se puede DROP DATABASE estando conectado a ella)
$maintenanceUrl = "postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/postgres"

# 4. Resolver psql.exe
if (-not $PsqlPath) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        $PsqlPath = $cmd.Source
    } else {
        $PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
    }
}
if (-not (Test-Path $PsqlPath)) {
    Write-Error "No se encontró psql en: $PsqlPath"
    exit 1
}

# 5. Confirmación explícita -- sin esto no se toca nada
Write-Host ""
Write-Host "ATENCION: esto va a BORRAR POR COMPLETO la base '$dbName' en ${dbHost}:${dbPort}" -ForegroundColor Yellow
Write-Host "y reemplazarla con el contenido de:" -ForegroundColor Yellow
Write-Host "  $BackupFile" -ForegroundColor Yellow
Write-Host "Todo lo que haya en '$dbName' ahora mismo se pierde. No hay deshacer." -ForegroundColor Yellow
Write-Host ""
$confirmacion = Read-Host "Para confirmar, escribi el nombre exacto de la base ('$dbName')"

if ($confirmacion -ne $dbName) {
    Write-Host "Nombre no coincide. Restauración cancelada, no se tocó nada." -ForegroundColor Cyan
    exit 0
}

# 6. Terminar conexiones activas a la base de destino (si no, no se puede borrar)
Write-Host "Cerrando conexiones activas a '$dbName'..."
& $PsqlPath $maintenanceUrl -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$dbName' AND pid <> pg_backend_pid();" | Out-Null

# 7. Borrar y recrear la base de destino
Write-Host "Recreando base '$dbName' vacía..."
& $PsqlPath $maintenanceUrl -c "DROP DATABASE IF EXISTS `"$dbName`";"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falló al borrar la base '$dbName'"
    exit 1
}
& $PsqlPath $maintenanceUrl -c "CREATE DATABASE `"$dbName`";"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falló al crear la base '$dbName'"
    exit 1
}

# 8. Cargar el backup en la base recién creada
Write-Host "Restaurando contenido del backup..."
& $PsqlPath $DatabaseUrl -f $BackupFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump/psql reportó errores durante la restauración. Revisá el detalle arriba."
    exit 1
}

Write-Host ""
Write-Host "Restauración completa: '$dbName' reconstruida desde $BackupFile" -ForegroundColor Green
