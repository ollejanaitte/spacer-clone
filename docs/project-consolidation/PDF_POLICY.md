# PDF Policy (著作物PDFの扱い)

本リポジトリの著作物PDFはGit管理対象外とし、ローカル専用領域 `local-reference/` に配置する。
PDF本体はGitHubへ commit/push しない。

## 配置ルール (local-reference/)

```
local-reference/
├── road/
│   ├── サンプル_道路設計図.pdf
│   ├── サンプル_道路線形計算例.pdf
│   └── 道路構造令の解説と運用_令和3年3月.pdf
└── bridge/
    ├── 鋼鈑桁橋_図面例.pdf
    └── 鋼鈑桁橋_設計計算例.pdf
```

## 対象PDF (著作物のためGit管理外)

- サンプル_道路設計図.pdf
- サンプル_道路線形計算例.pdf
- 道路構造令の解説と運用_令和3年3月.pdf
- 鋼鈑桁橋_図面例.pdf
- 鋼鈑桁橋_設計計算例.pdf

## 用途

- 設計ツールの機能比較・実装リファレンス用の参考資料。
- 本リポジトリの設計資料 (road / bridge) から参照される可能性があるが、
  本体はGit管理外のローカル資料としてのみ利用する。

## 運用ルール

- `local-reference/` は `.gitignore` 対象。
- PDF本体を docs へコピーしない。Git LFS へ登録しない。base64化・ZIP化・改名による
  GitHub への持ち込みは禁止。
- GitHub側には参考資料の名称・配置ルール・用途のみを残す（本ドキュメント）。
