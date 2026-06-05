#!/usr/bin/env bash
set -euo pipefail

GPU_MODE_VALUE="${1:-compat-gpu-blocklist}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.local_projects"
BACKEND_OUT_LOG="$LOG_DIR/backend-start.out.log"
BACKEND_ERR_LOG="$LOG_DIR/backend-start.err.log"
PYTHON_BIN="${PYTHON_BIN:-python3}"
BACKEND_PID=""

case "$GPU_MODE_VALUE" in
  normal|compat-gpu-blocklist|compat-angle-gl|legacy-desktop-gl)
    ;;
  *)
    echo "[エラー] GPU_MODE は normal, compat-gpu-blocklist, compat-angle-gl, legacy-desktop-gl のいずれかを指定してください。" >&2
    exit 1
    ;;
esac

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[起動] バックエンドを終了しています..."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "[エラー] $PYTHON_BIN コマンドが見つかりません。Python をインストールしてください。" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[エラー] npm コマンドが見つかりません。Node.js をインストールしてください。" >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "[エラー] frontend/node_modules が見つかりません。先に 'cd frontend && npm install' を実行してください。" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

echo "[起動] バックエンドを起動しています: http://127.0.0.1:8000"
cd "$ROOT_DIR"
"$PYTHON_BIN" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 >"$BACKEND_OUT_LOG" 2>"$BACKEND_ERR_LOG" &
BACKEND_PID="$!"

BACKEND_READY=0
for _ in $(seq 1 30); do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[エラー] バックエンドの起動に失敗しました。ログ: $BACKEND_ERR_LOG" >&2
    tail -n 20 "$BACKEND_ERR_LOG" >&2 || true
    exit 1
  fi

  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    BACKEND_READY=1
    break
  fi

  sleep 1
done

if [[ "$BACKEND_READY" != "1" ]]; then
  echo "[エラー] バックエンドの起動確認がタイムアウトしました。ログ: $BACKEND_ERR_LOG" >&2
  exit 1
fi

echo "[起動] Electron を起動しています。GPU_MODE=$GPU_MODE_VALUE"
cd "$FRONTEND_DIR"
GPU_MODE="$GPU_MODE_VALUE" npm run electron:dev
