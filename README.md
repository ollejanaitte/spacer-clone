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
