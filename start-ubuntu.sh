#!/usr/bin/env bash
# start-ubuntu.sh — Ubuntu / WSL 用 1 コマンド起動スクリプト
# Windows の start-windows.ps1 / macOS の start-mac.sh と同等の役割。
#
# Usage:
#   ./start-ubuntu.sh                       既定 (compat-gpu-blocklist で Electron 起動)
#   ./start-ubuntu.sh --safe-gpu            互換 GPU モード + ANGLE GL fallback
#   ./start-ubuntu.sh --legacy-gl           legacy desktop GL を使う
#   ./start-ubuntu.sh --normal              通常 GPU モード
#   ./start-ubuntu.sh --web                 Electron を起動せず Vite dev のみ
#   ./start-ubuntu.sh --backend-only        FastAPI のみ起動
#   ./start-ubuntu.sh --help                このヘルプを表示
#
# 環境変数:
#   PYTHON_BIN  使用する python (既定: リポジトリ内 .venv の python、なければ python3)
#   PORT        バックエンドの待受ポート (既定: 8000)
#   HOST        バックエンドの待受ホスト (既定: 127.0.0.1)
set -eo pipefail

# --------------------------------------------------------------
# 引数パース
# --------------------------------------------------------------
GPU_MODE="compat-gpu-blocklist"
LAUNCH_MODE="electron"  # electron | web | backend-only

print_help() {
  sed -n '2,20p' "$0"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --safe-gpu)   GPU_MODE="compat-angle-gl"; shift ;;
    --legacy-gl)  GPU_MODE="legacy-desktop-gl"; shift ;;
    --normal)     GPU_MODE="normal"; shift ;;
    --blocklist)  GPU_MODE="compat-gpu-blocklist"; shift ;;
    --web)        LAUNCH_MODE="web"; shift ;;
    --backend-only) LAUNCH_MODE="backend-only"; shift ;;
    --help|-h)    print_help ;;
    *)
      echo "[エラー] 不明な引数: $1" >&2
      echo "  ./start-ubuntu.sh --help で使い方を確認してください。" >&2
      exit 1
      ;;
  esac
done

# --------------------------------------------------------------
# パス
# --------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.local_projects"
BACKEND_OUT_LOG="$LOG_DIR/backend-start.out.log"
BACKEND_ERR_LOG="$LOG_DIR/backend-start.err.log"
VENV_DIR="$ROOT_DIR/.venv"
VENV_PY="$VENV_DIR/bin/python"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"
BACKEND_URL="http://${HOST}:${PORT}"

mkdir -p "$LOG_DIR"

# --------------------------------------------------------------
# 状態 (cleanup で参照するため初期化)
# --------------------------------------------------------------
BACKEND_PID=""
BACKEND_PGID=""
FRONTEND_PID=""

# --------------------------------------------------------------
# ログ用ユーティリティ
# --------------------------------------------------------------
info() { echo "[起動] $*"; }
err()  { echo "[エラー] $*" >&2; }

# --------------------------------------------------------------
# 必須コマンドの存在確認
# --------------------------------------------------------------
command -v node >/dev/null 2>&1 || { err "node が見つかりません。Node.js をインストールしてください。"; exit 1; }
command -v npm  >/dev/null 2>&1 || { err "npm が見つかりません。Node.js をインストールしてください。"; exit 1; }

# --------------------------------------------------------------
# Python venv の用意
# --------------------------------------------------------------
if [[ ! -x "$VENV_PY" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    info "Python venv を作成しています: $VENV_DIR"
    python3 -m venv "$VENV_DIR"
  else
    err "python3 が見つかりません。Python 3.10+ をインストールしてください。"
    exit 1
  fi
fi

# pip で必要最低限のバックエンド依存が入っているか確認
if ! "$VENV_PY" -c "import fastapi, uvicorn" >/dev/null 2>&1; then
  info "バックエンドの Python 依存をインストールしています..."
  "$VENV_PY" -m pip install --upgrade pip >/dev/null
  "$VENV_PY" -m pip install fastapi "uvicorn[standard]" numpy scipy pydantic jsonschema httpx pytest >/dev/null
fi

# --------------------------------------------------------------
# frontend / electron の依存
# --------------------------------------------------------------
if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  info "frontend の npm 依存をインストールしています..."
  ( cd "$FRONTEND_DIR" && npm install )
fi

# electron 本体バイナリが存在するか確認（postinstall のダウンロード失敗対策）
ELECTRON_BIN="$FRONTEND_DIR/node_modules/.bin/electron"
if [[ ! -x "$ELECTRON_BIN" ]]; then
  info "electron バイナリを取得しています..."
  ( cd "$FRONTEND_DIR" && npx --yes electron@$(node -p "require('./package.json').devDependencies.electron") --version >/dev/null )
fi

# desktop/electron を TypeScript でビルド
if [[ ! -f "$ROOT_DIR/desktop/electron/dist/main.js" ]]; then
  info "desktop/electron を TypeScript ビルドしています..."
  ( cd "$FRONTEND_DIR" && npm run electron:compile )
fi

# アイコン (build/icon.png) が必要なので、無ければ生成
if [[ ! -f "$ROOT_DIR/build/icon.png" ]]; then
  info "アイコンを生成しています..."
  ( cd "$ROOT_DIR" && "$VENV_PY" scripts/build_icons.py || true )
fi

# --------------------------------------------------------------
# バックエンドが既に立ち上がっているか
# --------------------------------------------------------------
backend_already_up() {
  curl -fsS "$BACKEND_URL/health" >/dev/null 2>&1 && \
  curl -fsS "$BACKEND_URL/openapi.json" 2>/dev/null | grep -q '"spacer-clone MVP API"' || return 1
  return 0
}

# ポート競合チェック
if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${PORT}$"; then
    if ! backend_already_up; then
      err "ポート ${PORT} は別のプロセスが使用しています。使用中のサービスを終了してから再実行してください。"
      exit 1
    fi
  fi
fi

# --------------------------------------------------------------
# バックエンド起動
# --------------------------------------------------------------
BACKEND_PID=""
if backend_already_up; then
  info "既に起動している Spacer Backend を使用します: ${BACKEND_URL}"
else
  info "バックエンドを起動しています: ${BACKEND_URL}  (GPU_MODE=$GPU_MODE, ログ: $BACKEND_ERR_LOG)"
  # setsid で新セッションに隔離 → 自前のプロセスグループを作り、cleanup 時にグループ単位で殺す
  setsid bash -c '
    cd "$1"
    exec "$2" -m uvicorn backend.app.main:app --host "$3" --port "$4" \
      >"$5" 2>"$6"
  ' bash "$ROOT_DIR" "$VENV_PY" "$HOST" "$PORT" "$BACKEND_OUT_LOG" "$BACKEND_ERR_LOG" &
  BACKEND_PID=$!
  BACKEND_PGID=$(ps -o pgid= -p "$BACKEND_PID" 2>/dev/null | tr -d ' ')
fi

# ヘルスチェック
backend_ready=0
for _ in $(seq 1 30); do
  if [[ -n "$BACKEND_PID" ]] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    err "バックエンドの起動に失敗しました。ログ: $BACKEND_ERR_LOG"
    tail -n 20 "$BACKEND_ERR_LOG" >&2 || true
    exit 1
  fi
  if curl -fsS "$BACKEND_URL/health" >/dev/null 2>&1; then
    backend_ready=1
    break
  fi
  sleep 1
done

if [[ "$backend_ready" != "1" ]]; then
  err "バックエンドの起動確認がタイムアウトしました。ログ: $BACKEND_ERR_LOG"
  exit 1
fi
info "バックエンド OK: ${BACKEND_URL}"

# --------------------------------------------------------------
# クリーンアップ
# --------------------------------------------------------------
LAST_SIGNAL=""
on_signal() {
  # SIGINT / SIGTERM を受けたことを記録 (cleanup で利用)
  LAST_SIGNAL="$1"
  trap '' INT TERM  # 多重発火を防ぐ
  kill -INT $$ 2>/dev/null || true
}
trap 'on_signal INT'  INT
trap 'on_signal TERM' TERM

cleanup() {
  local exit_code=$?
  # バックエンドプロセスグループを SIGTERM
  if [[ -n "$BACKEND_PGID" ]] && kill -0 "$BACKEND_PGID" 2>/dev/null; then
    info "バックエンド (pgid=$BACKEND_PGID, pid=$BACKEND_PID) を終了しています..."
    kill -TERM -"$BACKEND_PGID" 2>/dev/null || true
    for _ in $(seq 1 50); do
      kill -0 "$BACKEND_PID" 2>/dev/null || break
      sleep 0.1
    done
    kill -KILL -"$BACKEND_PGID" 2>/dev/null || true
  elif [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    info "バックエンド (pid=$BACKEND_PID) を終了しています..."
    kill "$BACKEND_PID" 2>/dev/null || true
    pkill -TERM -P "$BACKEND_PID" 2>/dev/null || true
    sleep 0.3
    kill -KILL "$BACKEND_PID" 2>/dev/null || true
  fi
  # 念のため同じ uvicorn を listen しているプロセスも停止
  pkill -f "uvicorn backend.app.main:app" 2>/dev/null || true
  # vite / electron 残骸があれば pgid ベースで停止
  pkill -TERM -f "frontend/node_modules/.bin/vite" 2>/dev/null || true
  pkill -TERM -f "desktop/electron/dist/main.js" 2>/dev/null || true
  pkill -TERM -f "node_modules/electron/dist/electron" 2>/dev/null || true
  sleep 0.3
  pkill -KILL -f "frontend/node_modules/.bin/vite" 2>/dev/null || true
  pkill -KILL -f "desktop/electron/dist/main.js" 2>/dev/null || true
  pkill -KILL -f "node_modules/electron/dist/electron" 2>/dev/null || true

  if [[ -n "$LAST_SIGNAL" ]]; then
    info "ユーザー割り込み (${LAST_SIGNAL}) を受け取りました。終了します。"
    # シグナルを受けた終了は慣習的に 128+signal
    if [[ "$LAST_SIGNAL" == "INT" ]]; then exit 130; fi
    if [[ "$LAST_SIGNAL" == "TERM" ]]; then exit 143; fi
  elif [[ "$exit_code" -ne 0 ]]; then
    err "異常終了 (code=$exit_code)"
  else
    info "正常終了"
  fi
  exit $exit_code
}
trap cleanup EXIT

# --------------------------------------------------------------
# フロント側
# --------------------------------------------------------------
if [[ "$LAUNCH_MODE" == "backend-only" ]]; then
  info "バックエンドのみ起動中。Ctrl+C で終了します。"
  # プロセスが落ちるか Ctrl+C まで待機
  wait "$BACKEND_PID" 2>/dev/null || true
  exit 0
fi

cd "$FRONTEND_DIR"
export GPU_MODE

if [[ "$LAUNCH_MODE" == "web" ]]; then
  info "Vite 開発サーバを起動しています (Electron は使いません)。ブラウザで http://127.0.0.1:5173 を開いてください。"
  npm run dev
else
  info "Electron を起動しています。GPU_MODE=$GPU_MODE"
  if [[ "$GPU_MODE" == "compat-gpu-blocklist" ]]; then
    npm run electron:dev
  else
    GPU_MODE="$GPU_MODE" npm run electron:dev
  fi
fi
