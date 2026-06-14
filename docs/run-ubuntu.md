# Ubuntu / WSL での起動手順

`spacer-clone` を Ubuntu 20.04 以降 / WSL2 (Ubuntu) で 1 コマンドで起動する手順です。
`start-windows.ps1` / `start-mac.sh` と同等の位置付けで、Python venv・npm 依存・Electron まで自動で揃えます。

## 必要環境

| 項目 | 推奨 |
|------|------|
| OS | Ubuntu 20.04+ / WSL2 (Ubuntu) |
| Python | 3.10 以上 |
| Node.js | 18 以上 (LTS 推奨) |
| npm | 9 以上 |

足りない場合は:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm
```

> すでに `python3` / `node` / `npm` が `PATH` にあるなら、venv や `frontend/node_modules` を
> スクリプトが自動作成するため事前準備は不要です。

## クイックスタート

```bash
cd ~/Projects/spacer-clone
./start-ubuntu.sh
```

実行内容:

1. リポジトリルートへ移動
2. `.venv` を作成 (なければ)
3. `fastapi`, `uvicorn`, `numpy`, `scipy` などの Python 依存を自動インストール
4. `frontend/node_modules` を `npm install` で作成 (なければ)
5. `desktop/electron/dist/main.js` を `tsc` でビルド (なければ)
6. `build/icon.png` を `scripts/build_icons.py` で生成 (なければ)
7. FastAPI バックエンドを `http://127.0.0.1:8000` で起動
8. Electron 開発環境を `compat-gpu-blocklist` で起動

終了は **Ctrl+C**。バックエンド・Electron・関連プロセスグループをすべて停止します。

## 起動オプション

```bash
./start-ubuntu.sh                   # 既定: Electron + compat-gpu-blocklist
./start-ubuntu.sh --safe-gpu        # ANGLE GL フォールバック
./start-ubuntu.sh --legacy-gl       # legacy desktop GL
./start-ubuntu.sh --normal          # 通常 GPU (Linux 標準ドライバ向け)
./start-ubuntu.sh --web             # Electron なし・Vite dev のみ (ブラウザで http://127.0.0.1:5173 を開く)
./start-ubuntu.sh --backend-only    # FastAPI のみ (curl などで検証する用途)
./start-ubuntu.sh --help            # ヘルプ
```

GPU モードは `desktop/electron/gpuMode.ts` の `GPU_MODES` と一致します。

## 環境変数

| 変数 | 既定値 | 説明 |
|------|--------|------|
| `PYTHON_BIN` | `.venv/bin/python` | Python 実行ファイル |
| `HOST` | `127.0.0.1` | バックエンド待受ホスト |
| `PORT` | `8000` | バックエンド待受ポート |
| `GPU_MODE` | (`--safe-gpu` 等の選択に従う) | Electron へそのまま渡される |

例:

```bash
PORT=8765 ./start-ubuntu.sh --web
```

## ログ

| ファイル | 内容 |
|----------|------|
| `.local_projects/backend-start.out.log` | FastAPI の stdout |
| `.local_projects/backend-start.err.log` | FastAPI の stderr |

## トラブルシューティング

### Electron が真っ黒 / 起動しない

GPU モードを変えて再実行:

```bash
./start-ubuntu.sh --legacy-gl    # もしくは --safe-gpu
```

### Wayland で起動したい

```bash
./start-ubuntu.sh --normal        # 標準 GPU モードで Wayland を優先
```

### Wayland が動かない / クラッシュする

X11 セッションに切り替えるか、`--safe-gpu` を使ってください。

### 「ポート 8000 は別のプロセスが使用しています」

```bash
# 確認
ss -ltn | grep 8000
# 解放
fuser -k 8000/tcp
```

### 「frontend/node_modules が見つかりません」が出る

オフライン環境などで自動 `npm install` に失敗したケースです。手動で:

```bash
cd frontend
npm install
cd ..
./start-ubuntu.sh
```

### Ctrl+C でプロセスが残る

`backend` / `vite` / `electron` のいずれかがプロセスグループ外に張り付くケースです。cleanup が `pkill -f` でフォールバックしますが、強制的に掃除するには:

```bash
pkill -f "uvicorn backend.app.main:app"
pkill -f "frontend/node_modules/.bin/vite"
pkill -f "node_modules/electron/dist/electron"
```

### X サーバが無く GUI が立ち上がらない (CI / WSLg 無し)

Electron をスキップして Web (Vite) モードで:

```bash
./start-ubuntu.sh --web
```

もしくはバックエンドのみ:

```bash
./start-ubuntu.sh --backend-only
```

## 開発 Tips

- 依存を明示的に更新したいとき:

  ```bash
  # Python
  .venv/bin/pip install -U <pkg>
  # npm
  cd frontend && npm install <pkg>
  ```

- バックエンドログを別ターミナルで追いたい:

  ```bash
  tail -f .local_projects/backend-start.err.log
  ```

- テスト:

  ```bash
  .venv/bin/pytest backend/ -q
  cd frontend && npx vitest run
  ```
