# backup-alnext.ps1
#
# Backup automático/manual de ALNEXT -- pg_dump contra la base configurada,
# guarda un archivo con fecha/hora en una carpeta local fuera de lo que sirve
# la app por HTTP, y borra automáticamente los backups más viejos dejando
# solo los últimos N (retención configurable).
#
# Uso normal (lee DATABASE_URL del .env del proyecto):
#   powershell -ExecutionPolicy Bypass -File backup-alnext.ps1
#
# Uso de prueba (conexión directa, sin .env):
#   powershell -ExecutionPolicy Bypass -File backup-alnext.ps1 -DatabaseUrl "postgresql://postgres:admin123@localhost:5432/gestor_prueba_backup"
#
# Pensado para correr como tarea programada de Windows (Task Scheduler),
# con dos triggers: "al iniciar sesión" y "cada 4 horas mientras la PC está
# encendida" -- no hace falta que la PC quede prendida a la noche (Task
# Scheduler simplemente no dispara si está apagada, y retoma en el próximo
# encendido/logon).

param(
    [string]$DatabaseUrl   = "",
    [string]$EnvFile       = "$PSScriptRoot\..\.env",
    [string]$BackupDir     = "$PSScriptRoot\..\backups",
    [int]$RetenerUltimos   = 14,
    [string]$PgDumpPath    = ""
)

$ErrorActionPreference = "Stop"

# 1. Resolver la connection string: parámetro directo, o leer del .env
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

# 2. Resolver pg_dump.exe: usar el del PATH si está, si no el default de la instalación
if (-not $PgDumpPath) {
    $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($cmd) {
        $PgDumpPath = $cmd.Source
    } else {
        $PgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
    }
}
if (-not (Test-Path $PgDumpPath)) {
    Write-Error "No se encontró pg_dump en: $PgDumpPath"
    exit 1
}

# 3. Preparar carpeta de backups
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp  = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path $BackupDir "alnext_backup_$timestamp.sql"

# 4. Ejecutar pg_dump (formato plano: se restaura con psql, sin depender de pg_restore)
& $PgDumpPath $DatabaseUrl --format=plain --file=$backupFile

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump falló con código $LASTEXITCODE"
    exit 1
}

Write-Host "Backup creado: $backupFile"

# 5. Retención: dejar solo los últimos N backups, borrar el resto
$backups = Get-ChildItem $BackupDir -Filter "alnext_backup_*.sql" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt $RetenerUltimos) {
    $aBorrar = $backups | Select-Object -Skip $RetenerUltimos
    foreach ($b in $aBorrar) {
        Remove-Item $b.FullName -Force
        Write-Host "Backup viejo eliminado: $($b.Name)"
    }
}