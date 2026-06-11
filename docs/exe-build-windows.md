# Windows exe化メモ

この修正版では、Electron のパッケージ版で以下を行います。

- `resources/backend/spacer-backend.exe` を自動起動
- `resources/frontend/index.html` を読み込み
- Vite の assets を `file://` でも読めるように `base: "./"` を指定
- Electron main は CommonJS として動かすため、`frontend/package.json` から `type: "module"` を削除
- preload は空にして、不要な `./gpuMode` 読み込みエラーを回避

## ビルド手順

```powershell
cd "C:\Users\織田雅春\Desktop\三次元立体骨組み解析ソフトプロジェクト\spacer-clone\frontend"
npm run pack:win
```

起動ファイル:

```text
release\win-unpacked\Spacer Clone.exe
```

配布時は `Spacer Clone.exe` 単体ではなく、`release\win-unpacked` フォルダごと zip 化してください。
