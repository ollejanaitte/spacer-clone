# spacer-clone

Initial repository baseline for pull requests.

## Windowsでの起動

通常はリポジトリのルートで次を実行します。

```powershell
.\start-windows.ps1
```

このコマンドでFastAPIバックエンドとElectron版React UIをまとめて起動します。デフォルトのGPU互換モードは `compat-gpu-blocklist` です。

GPU互換モードを指定する場合は次のように起動します。

```powershell
.\start-windows.ps1 -GpuMode normal
.\start-windows.ps1 -GpuMode compat-angle-gl
```

選べるモードは `normal`, `compat-gpu-blocklist`, `compat-angle-gl`, `legacy-desktop-gl` です。`legacy-desktop-gl` は表示できない場合の最後の非常用で、通常は使わないでください。

終了するにはElectronのウィンドウを閉じるか、起動したPowerShellで `Ctrl+C` を押します。スクリプトは終了時にバックエンドも停止します。

うまく表示されない場合は、まず `compat-angle-gl` を試してください。それでも表示できない場合のみ `legacy-desktop-gl` を試します。バックエンド起動ログは `.local_projects/backend-start.out.log` と `.local_projects/backend-start.err.log` に出力されます。

既存の手動起動も引き続き使えます。

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
$env:GPU_MODE="compat-gpu-blocklist"
npm run electron:dev
```

## Macでの起動

Macでは次を実行します。

```bash
./start-mac.sh
```

GPU互換モードを指定する場合は引数で渡します。

```bash
./start-mac.sh compat-angle-gl
```

Pythonコマンド名を変えたい場合は `PYTHON_BIN` を指定できます。

```bash
PYTHON_BIN=python ./start-mac.sh
```

## exe 配布版での起動

ビルド済みの配布物を使う場合、フォルダに同梱された `Spacer Clone.exe` を実行します。

- 配布物にはバックエンド（PyInstaller onefile 化済み）とフロントエンド（Vite ビルド）が含まれます。
- バックエンドの展開のため、**初回起動には数秒〜十数秒かかる**ことがあります。
- 起動中はスプラッシュ画面が表示され、「バックエンドを起動しています」「UIを準備しています」のように状態が切り替わります。
- スプラッシュが閉じ、メインウィンドウが表示されたら起動完了です。

## 起動中ステータス表示

バックエンドの起動待ち、UI の初期化中、エラー発生時を画面で確認できます。

- バックエンド起動中: 「バックエンドを起動しています。初回は数秒かかる場合があります。」と表示
- UI 準備中: 「UIを準備しています。」と表示
- 起動失敗時: エラー内容をダイアログで表示

## バージョン表示

メイン画面左上のプロジェクト名の下に `Version x.y.z` を表示します。値はバックエンド `/health` レスポンスの `version` を表示しているため、バックエンドとフロントを別々に動かした場合も、表示されているバージョンはバックエンド側のものです。

バックエンドを起動できない場合は `Version 0.0.0` が表示されます。

## サンプルJSON（動的解析）

動的解析を試したい方は、まず次のサンプルを開いてください。`examples/` フォルダにあります。

- `examples/cantilever_eigen.json` — 片持ち梁 固有値解析
- `examples/simple_beam_eigen.json` — 単純梁 固有値解析
- `examples/cantilever_response_spectrum.json` — 片持ち梁 応答スペクトル解析（SRSS）
- `examples/simple_beam_response_spectrum.json` — 単純梁 応答スペクトル解析（SRSS）

使い方:

1. UI の「開く」から該当 JSON を選択するか、API 経由で `/api/examples` から取得します。
2. サンプルを開いたら、左ペインで「質量ケース」「解析設定」を確認します。
3. ツールバーの「固有値」または「応答」ボタンを押して解析を実行します。
4. 結果は下部の結果タブに表示されます。PDF 帳票で帳票化できます。

これらは社内試用の入口として位置付けています。質量やスペクトル点の数値は `analysisSettings` 内で書き換えられるので、動的解析のパラメータ感度を手早く確認できます。

## PDF帳票

ツールバーの「PDF 帳票」ボタンで印刷可能なHTML帳票を開きます。`window.print()` 経由でPDF化されます。

線形静的解析に加え、動的解析の結果も以下を含みます。

- 固有値表（モード番号 / 固有値 / 固有円振動数 / 固有振動数 / 固有周期 / 刺激係数 X Y Z / 有効質量比 X Y Z / 累積有効質量比 X Y Z）
- 有効質量比サマリ（方向 / 総質量 / 最終累積有効質量比 / 使用モード数）
- 応答スペクトル条件（スペクトルケースID / 起震方向 / 減衰定数 / モード合成方法 / 目標累積有効質量比 / 使用モード / スペクトル点数）
- SRSS変位表（節点番号 / DX DY DZ / RX RY RZ）

データが存在しない場合（線形静的解析のみの実行時など）は、対応するセクションは帳票に出力されません。

## トラブル時の確認方法

- **起動しない・黒い画面のまま**: `.local_projects/backend-start.err.log` を確認します。バックエンドが起動していないとフロント側はスプラッシュで停止します。
- **ビルド済みexeで初回起動が遅い**: PyInstaller 展開のため十数秒かかることがあります。2回目以降は高速になります。
- **開発環境で個別に確認したい**:

  ```powershell
  cd backend
  .venv\Scripts\python.exe -m pytest -q
  ```

  ```powershell
  cd frontend
  npm test -- --run
  npm run build
  ```

  バックエンドの API テスト (`tests/test_api.py`) は FastAPI の TestClient を使うため、sandbox 環境や一部 CI 環境ではハングすることがあります。その場合は `pytest -q -k "not api"` でエンジン系のテストのみを確認してください。
- **画面が真っ黒で3D表示が出ない**: README冒頭の GPU 互換モードの説明を参照し、`compat-angle-gl` → `legacy-desktop-gl` の順に切り替えてみてください。
