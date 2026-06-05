param(
  [ValidateSet("normal", "compat-gpu-blocklist", "compat-angle-gl", "legacy-desktop-gl")]
  [string]$GpuMode = "compat-gpu-blocklist"
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $RootDir "frontend"
$LogDir = Join-Path $RootDir ".local_projects"
$BackendOutLog = Join-Path $LogDir "backend-start.out.log"
$BackendErrLog = Join-Path $LogDir "backend-start.err.log"
$BackendProcess = $null
$PreviousGpuMode = [Environment]::GetEnvironmentVariable("GPU_MODE", "Process")

function Write-Info {
  param([string]$Message)
  Write-Host "[起動] $Message"
}

function Write-UserError {
  param([string]$Message)
  Write-Host "[エラー] $Message" -ForegroundColor Red
}

function Stop-Backend {
  if ($null -ne $BackendProcess -and -not $BackendProcess.HasExited) {
    Write-Info "バックエンドを終了しています..."
    $ChildProcesses = Get-CimInstance Win32_Process -Filter "ParentProcessId = $($BackendProcess.Id)" -ErrorAction SilentlyContinue
    foreach ($ChildProcess in $ChildProcesses) {
      Stop-Process -Id $ChildProcess.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    $BackendProcess.WaitForExit(5000) | Out-Null
  }
}

try {
  Set-Location $RootDir

  if (-not (Test-Path $FrontendDir)) {
    throw "frontend フォルダが見つかりません。リポジトリのルートで実行してください。"
  }

  $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($null -eq $PythonCommand) {
    throw 'python コマンドが見つかりません。Python をインストールし、PATH に追加してください。'
  }

  $NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
  if ($null -eq $NpmCommand) {
    throw 'npm コマンドが見つかりません。Node.js をインストールしてください。'
  }

  if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    throw 'frontend/node_modules が見つかりません。先に cd frontend して npm install を実行してください。'
  }

  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

  Write-Info "バックエンドを起動しています: http://127.0.0.1:8000"
  $BackendArgs = @(
    "-m", "uvicorn",
    "backend.app.main:app",
    "--reload",
    "--host", "127.0.0.1",
    "--port", "8000"
  )
  $BackendProcess = Start-Process `
    -FilePath $PythonCommand.Source `
    -ArgumentList $BackendArgs `
    -WorkingDirectory $RootDir `
    -RedirectStandardOutput $BackendOutLog `
    -RedirectStandardError $BackendErrLog `
    -PassThru `
    -WindowStyle Hidden

  $BackendReady = $false
  for ($Attempt = 1; $Attempt -le 30; $Attempt += 1) {
    if ($BackendProcess.HasExited) {
      $ErrTail = ""
      if (Test-Path $BackendErrLog) {
        $ErrTail = (Get-Content $BackendErrLog -Tail 20 -ErrorAction SilentlyContinue) -join "`n"
      }
      throw "バックエンドの起動に失敗しました。ログ: $BackendErrLog`n$ErrTail"
    }

    try {
      Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 1 | Out-Null
      $BackendReady = $true
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $BackendReady) {
    throw "バックエンドの起動確認がタイムアウトしました。ログを確認してください: $BackendErrLog"
  }

  Write-Info "Electron を起動しています。GPU_MODE=$GpuMode"
  [Environment]::SetEnvironmentVariable("GPU_MODE", $GpuMode, "Process")
  Push-Location $FrontendDir
  try {
    npm run electron:dev
  } finally {
    Pop-Location
  }
} catch {
  Write-UserError $_.Exception.Message
  exit 1
} finally {
  [Environment]::SetEnvironmentVariable("GPU_MODE", $PreviousGpuMode, "Process")
  Stop-Backend
}

