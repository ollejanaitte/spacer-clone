#!/usr/bin/env bash
# start-ubuntu.sh — Ubuntu / WSL 用 1 コマンド起動スクリプト
# Windows の start-windows.ps1 / macOS の start-mac.sh と同等の役割。
#
# Usage:
#   ./start-ubuntu.sh                       既定 (Apollo Phase 1-NN 非Numeric入口 + compat-gpu-blocklist で Electron 起動)
#   ./start-ubuntu.sh --apollo             Apollo Phase 1-NN 用の既定起動を明示
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
APOLLO_MODE="1"

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
    --apollo)     APOLLO_MODE="1"; shift ;;
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
FRONTEND_PACKAGE_JSON="$FRONTEND_DIR/package.json"
FRONTEND_LOCK_FILE="$FRONTEND_DIR/package-lock.json"
FRONTEND_NODE_MODULES="$FRONTEND_DIR/node_modules"
FRONTEND_DEPENDENCY_STAMP="$LOG_DIR/frontend-deps.lockstamp"
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
BACKEND_STARTED_BY_SCRIPT="0"
FRONTEND_PID=""
FRONTEND_PGID=""
FRONTEND_STARTED_BY_SCRIPT="0"
LAST_SIGNAL=""

# --------------------------------------------------------------
# ログ用ユーティリティ
# --------------------------------------------------------------
info() { echo "[起動] $*"; }
err()  { echo "[エラー] $*" >&2; }

terminate_process_group() {
  local label="$1"
  local pid="$2"
  local pgid="$3"
  if [[ -n "$pgid" ]] && kill -0 "-$pgid" 2>/dev/null; then
    info "${label} (pgid=$pgid, pid=$pid) を終了しています..."
    kill -TERM "-$pgid" 2>/dev/null || true
    for _ in $(seq 1 50); do
      kill -0 "-$pgid" 2>/dev/null || return 0
      sleep 0.1
    done
    kill -KILL "-$pgid" 2>/dev/null || true
    return 0
  fi
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    info "${label} (pid=$pid) を終了しています..."
    kill -TERM "$pid" 2>/dev/null || true
    sleep 0.3
    kill -KILL "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM HUP

  if [[ "$FRONTEND_STARTED_BY_SCRIPT" == "1" ]]; then
    terminate_process_group "フロントエンド" "$FRONTEND_PID" "$FRONTEND_PGID"
    pkill -TERM -f "$ROOT_DIR/frontend/node_modules/.bin/vite" 2>/dev/null || true
    pkill -TERM -f "$ROOT_DIR/desktop/electron/dist/main.js" 2>/dev/null || true
    pkill -TERM -f "$ROOT_DIR/frontend/node_modules/electron/dist/electron" 2>/dev/null || true
    sleep 0.3
    pkill -KILL -f "$ROOT_DIR/frontend/node_modules/.bin/vite" 2>/dev/null || true
    pkill -KILL -f "$ROOT_DIR/desktop/electron/dist/main.js" 2>/dev/null || true
    pkill -KILL -f "$ROOT_DIR/frontend/node_modules/electron/dist/electron" 2>/dev/null || true
  fi

  if [[ "$BACKEND_STARTED_BY_SCRIPT" == "1" ]]; then
    terminate_process_group "バックエンド" "$BACKEND_PID" "$BACKEND_PGID"
    pkill -TERM -f "$ROOT_DIR/.venv/bin/python -m uvicorn backend.app.main:app" 2>/dev/null || true
    sleep 0.3
    pkill -KILL -f "$ROOT_DIR/.venv/bin/python -m uvicorn backend.app.main:app" 2>/dev/null || true
  fi

  case "$LAST_SIGNAL" in
    INT) exit_code=130 ;;
    TERM) exit_code=143 ;;
    HUP) exit_code=129 ;;
  esac

  if [[ -n "$LAST_SIGNAL" ]]; then
    info "ユーザー割り込み (${LAST_SIGNAL}) を受け取りました。終了します。"
  elif [[ "$exit_code" -ne 0 ]]; then
    err "異常終了 (code=$exit_code)"
  else
    info "正常終了"
  fi

  exit "$exit_code"
}

on_signal() {
  LAST_SIGNAL="$1"
  case "$1" in
    INT) exit 130 ;;
    TERM) exit 143 ;;
    HUP) exit 129 ;;
    *) exit 1 ;;
  esac
}

trap cleanup EXIT
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM
trap 'on_signal HUP' HUP

dependency_stamp_value() {
  node -e '
    const crypto = require("node:crypto");
    const fs = require("node:fs");
    const paths = process.argv.slice(1);
    const hashes = [];
    for (const filePath of paths) {
      if (fs.existsSync(filePath)) {
        hashes.push(crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"));
      }
    }
    process.stdout.write(hashes.join(":"));
  ' "$@"
}

frontend_dependency_resolution_ok() {
  (
    cd "$FRONTEND_DIR"
    node -e "require.resolve('zod/package.json')" >/dev/null 2>&1 &&
    npm ls --depth=0 --json >/dev/null 2>&1
  )
}

repair_frontend_dependencies() {
  local install_command="npm install"
  if [[ -f "$FRONTEND_LOCK_FILE" ]]; then
    install_command="npm ci"
  fi

  info "依存関係が不足しているか古くなっています。${install_command} を実行します..."
  if [[ -f "$FRONTEND_LOCK_FILE" ]]; then
    ( cd "$FRONTEND_DIR" && npm ci )
  else
    ( cd "$FRONTEND_DIR" && npm install )
  fi

  if ! frontend_dependency_resolution_ok; then
    err "フロントエンド依存関係の復旧後も zod を解決できません。frontend で ${install_command} を再実行し、ログを確認してください。"
    exit 1
  fi
}

ensure_frontend_dependencies() {
  info "フロントエンド依存関係を確認しています..."

  if [[ ! -f "$FRONTEND_PACKAGE_JSON" ]]; then
    err "frontend/package.json が見つかりません。リポジトリの内容を確認してください。"
    exit 1
  fi

  if [[ ! -f "$FRONTEND_LOCK_FILE" ]]; then
    info "frontend/package-lock.json が見つかりません。npm install を使用します。"
  fi

  local expected_stamp=""
  expected_stamp="$(dependency_stamp_value "$FRONTEND_PACKAGE_JSON" "$FRONTEND_LOCK_FILE")"
  local stored_stamp=""
  if [[ -f "$FRONTEND_DEPENDENCY_STAMP" ]]; then
    stored_stamp="$(<"$FRONTEND_DEPENDENCY_STAMP")"
  fi

  local deps_ok="0"
  if [[ -d "$FRONTEND_NODE_MODULES" ]] && frontend_dependency_resolution_ok; then
    deps_ok="1"
  fi

  if [[ ! -d "$FRONTEND_NODE_MODULES" || "$deps_ok" != "1" || "$stored_stamp" != "$expected_stamp" ]]; then
    repair_frontend_dependencies
    expected_stamp="$(dependency_stamp_value "$FRONTEND_PACKAGE_JSON" "$FRONTEND_LOCK_FILE")"
  fi

  printf '%s' "$expected_stamp" > "$FRONTEND_DEPENDENCY_STAMP"
  info "フロントエンド依存関係: OK"
}

# --------------------------------------------------------------
# 必須コマンドの存在確認
# --------------------------------------------------------------
command -v node >/dev/null 2>&1 || { err "node が見つかりません。Node.js をインストールしてください。"; exit 1; }
command -v npm  >/dev/null 2>&1 || { err "npm が見つかりません。Node.js をインストールしてください。"; exit 1; }
ensure_frontend_dependencies

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

# electron 本体バイナリが存在するか確認（postinstall のダウンロード失敗対策）
ELECTRON_BIN="$FRONTEND_DIR/node_modules/.bin/electron"
if [[ ! -x "$ELECTRON_BIN" ]]; then
  info "electron バイナリを取得しています..."
  ( cd "$FRONTEND_DIR" && npx --yes electron@$(node -p "require('./package.json').devDependencies.electron") --version >/dev/null )
fi

# desktop/electron を TypeScript でビルド
# dist/main.js が無い場合、または .ts ソースが dist より新しい場合は再ビルドする
# （stale dist による「ソース更新が Electron 起動へ反映されない」事象を防ぐ）
ELECTRON_DIST="$ROOT_DIR/desktop/electron/dist/main.js"
ELECTRON_NEEDS_COMPILE="0"
if [[ ! -f "$ELECTRON_DIST" ]]; then
  ELECTRON_NEEDS_COMPILE="1"
else
  while IFS= read -r -d '' SRC_FILE; do
    if [[ "$SRC_FILE" -nt "$ELECTRON_DIST" ]]; then
      ELECTRON_NEEDS_COMPILE="1"
      break
    fi
  done < <(find "$ROOT_DIR/desktop/electron" -name '*.ts' -not -path '*/dist/*' -print0)
fi
if [[ "$ELECTRON_NEEDS_COMPILE" == "1" ]]; then
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
  BACKEND_STARTED_BY_SCRIPT="1"
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

launch_frontend() {
  local -a command
  if [[ "$LAUNCH_MODE" == "web" ]]; then
    info "Vite 開発サーバを起動しています (Electron は使いません)。ブラウザで http://127.0.0.1:5173 を開いてください。"
    if [[ "$APOLLO_MODE" == "1" ]]; then
      command=(npm run dev:apollo -- --host 127.0.0.1 --strictPort)
    else
      command=(npm run dev -- --host 127.0.0.1 --strictPort)
    fi
  else
    info "Electron を起動しています。GPU_MODE=$GPU_MODE APOLLO_MODE=$APOLLO_MODE"
    if [[ "$GPU_MODE" == "compat-gpu-blocklist" ]]; then
      if [[ "$APOLLO_MODE" == "1" ]]; then
        command=(npm run electron:dev:apollo)
      else
        command=(npm run electron:dev)
      fi
    else
      if [[ "$APOLLO_MODE" == "1" ]]; then
        command=(env GPU_MODE="$GPU_MODE" npm run electron:dev:apollo)
      else
        command=(env GPU_MODE="$GPU_MODE" npm run electron:dev)
      fi
    fi
  fi

  setsid bash -lc '
    cd "$1"
    shift
    exec "$@"
  ' bash "$FRONTEND_DIR" "${command[@]}" &
  FRONTEND_PID=$!
  FRONTEND_PGID=$(ps -o pgid= -p "$FRONTEND_PID" 2>/dev/null | tr -d ' ')
  FRONTEND_STARTED_BY_SCRIPT="1"
  info "フロントエンド監視を開始しました: pid=$FRONTEND_PID pgid=${FRONTEND_PGID:-unknown}"
  wait "$FRONTEND_PID"
  local exit_code=$?
  FRONTEND_STARTED_BY_SCRIPT="0"
  if [[ "$BACKEND_STARTED_BY_SCRIPT" == "1" ]]; then
    terminate_process_group "バックエンド" "$BACKEND_PID" "$BACKEND_PGID"
    BACKEND_STARTED_BY_SCRIPT="0"
  fi
  return "$exit_code"
}

launch_frontend
