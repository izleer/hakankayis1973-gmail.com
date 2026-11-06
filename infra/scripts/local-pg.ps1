# Yerel geliştirme PostgreSQL kümesini yönetir (Windows).
# Küme: %USERPROFILE%\.izleer-pg  (data + pgsql ikilileri)
# Port ve dinleme adresi data/postgresql.conf içinde tanımlıdır (127.0.0.1:5432).
#
#   powershell -ExecutionPolicy Bypass -File infra/scripts/local-pg.ps1 -Action start
#   powershell -ExecutionPolicy Bypass -File infra/scripts/local-pg.ps1 -Action status
#   powershell -ExecutionPolicy Bypass -File infra/scripts/local-pg.ps1 -Action stop
#
# İlk kurulum (bir kez): initdb + varlik_hafizasi veritabanı README'deki
# "Yerel PostgreSQL (Windows)" bölümünde anlatılır.

param(
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action = 'start',
  [string]$BinDir = (Join-Path $HOME '.izleer-pg\pgsql\bin'),
  [string]$DataDir = (Join-Path $HOME '.izleer-pg\data'),
  [int]$Port = 5432
)

$pgctl = Join-Path $BinDir 'pg_ctl.exe'
if (-not (Test-Path $pgctl)) {
  Write-Error "pg_ctl bulunamadi: $pgctl"
  exit 1
}
if (-not (Test-Path (Join-Path $DataDir 'PG_VERSION'))) {
  Write-Error "Veri dizini hazir degil: $DataDir"
  exit 1
}

$logFile = Join-Path (Split-Path $DataDir -Parent) 'server.log'

function Test-LocalPort {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect('127.0.0.1', $Port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

switch ($Action) {
  'start' {
    if (Test-LocalPort) {
      Write-Host "PostgreSQL zaten $Port portunda calisiyor."
      exit 0
    }
    # Start-Process ile ayri baslatilir; sunucu bu pencerenin ciktisini tutmaz.
    Start-Process -FilePath $pgctl `
      -ArgumentList @('-D', $DataDir, '-l', $logFile, 'start') `
      -WindowStyle Hidden | Out-Null
    for ($i = 0; $i -lt 40; $i++) {
      Start-Sleep -Milliseconds 500
      if (Test-LocalPort) {
        Write-Host "PostgreSQL $Port portunda hazir."
        exit 0
      }
    }
    Write-Error "PostgreSQL baslatilamadi. Gunluk: $logFile"
    exit 1
  }
  'stop' {
    & $pgctl -D $DataDir -w stop -m fast
    exit $LASTEXITCODE
  }
  'status' {
    if (Test-LocalPort) {
      & $pgctl -D $DataDir status
      exit $LASTEXITCODE
    }
    Write-Host "PostgreSQL $Port portunda calismiyor."
    exit 1
  }
}
