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

function Test-SpacerBackend {
  try {
    $Health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 1
    $OpenApi = Invoke-RestMethod -Uri "http://127.0.0.1:8000/openapi.json" -TimeoutSec 1
    return $Health.status -eq "ok" -and $OpenApi.info.title -eq "spacer-clone MVP API"
  } catch {
    return $false
  }
}

function Find-Python {
  $Candidates = @(
    (Join-Path $RootDir "backend\.venv\Scripts\python.exe"),
    (Join-Path $RootDir ".venv\Scripts\python.exe"),
    (Join-Path $RootDir "venv\Scripts\python.exe")
  )

  foreach ($Candidate in $Candidates) {
    if (Test-Path $Candidate) {
      return (Resolve-Path $Candidate).Path
    }
  }

  $SystemPython = Get-Command python.exe -ErrorAction SilentlyContinue
  if ($null -ne $SystemPython) {
    return $SystemPython.Source
  }

  throw @"
Python 実行環境が見つかりません。
次のいずれかを用意してください:
  backend\.venv\Scripts\python.exe
  .venv\Scripts\python.exe
  PATH 上の python.exe
依存関係として fastapi、uvicorn、numpy、scipy が必要です。
"@
}

try {
  Set-Location $RootDir

  if (-not (Test-Path $FrontendDir)) {
    throw "frontend フォルダが見つかりません。リポジトリのルートで実行してください。"
  }

  $NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -eq $NpmCommand) {
    throw 'npm コマンドが見つかりません。Node.js をインストールしてください。'
  }

  if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    throw 'frontend/node_modules が見つかりません。先に cd frontend して npm install を実行してください。'
  }

  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

  if (Test-SpacerBackend) {
    Write-Info "既に起動している Spacer Backend を使用します: http://127.0.0.1:8000"
  } else {
    $PythonExecutable = Find-Python
    $PortInUse = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($null -ne $PortInUse) {
      throw "ポート8000は別のプロセスが使用しています。使用中のサービスを終了してから再実行してください。"
    }

    Write-Info "バックエンドを起動しています: http://127.0.0.1:8000"
    Remove-Item $BackendOutLog, $BackendErrLog -Force -ErrorAction SilentlyContinue
    $BackendArgs = @(
      "-m", "uvicorn",
      "backend.app.main:app",
      "--host", "127.0.0.1",
      "--port", "8000"
    )
    $BackendProcess = Start-Process `
      -FilePath $PythonExecutable `
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

      if (Test-SpacerBackend) {
        $BackendReady = $true
        break
      }
      Start-Sleep -Seconds 1
    }

    if (-not $BackendReady) {
      throw "バックエンドの起動確認がタイムアウトしました。ログを確認してください: $BackendErrLog"
    }
  }

  Write-Info "Electron を起動しています。GPU_MODE=$GpuMode"
  [Environment]::SetEnvironmentVariable("GPU_MODE", $GpuMode, "Process")
  Push-Location $FrontendDir
  try {
    & $NpmCommand.Source run electron:dev
    if ($LASTEXITCODE -ne 0) {
      throw "Electron 開発環境が終了コード $LASTEXITCODE で停止しました。"
    }
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

