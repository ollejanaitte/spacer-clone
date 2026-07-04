# Contributing

`spacer-clone` は Preview 段階の構造解析 / LINER 統合プロジェクトです。変更時は、解析結果の再現性、仕様との整合、UI と solver の責務分離を優先してください。

## Development Flow

1. Issue または既存ドキュメントで目的を確認する。
2. 関連する設計書を読む。
3. 小さなブランチを作る。
4. 実装とテストを同じ変更単位に含める。
5. 必要に応じて `README.md`、`docs/`、`CHANGELOG.md` を更新する。
6. Pull Request を作成し、テスト結果と影響範囲を記載する。

## Branch Naming

推奨:

- `feature/<short-topic>`
- `fix/<short-topic>`
- `docs/<short-topic>`
- `refactor/<short-topic>`
- `test/<short-topic>`

例:

```text
feature/liner-dxf-export
fix/time-history-result-scale
docs/architecture-index
```

## Commit Messages

Conventional Commits 風の短いメッセージを推奨します。

```text
feat: add liner profile dxf export
fix: validate non-finite project values
docs: reorganize architecture overview
test: add bridge fem generator regression
refactor: isolate time history chart scale
```

## Pull Requests

PR には次を含めてください。

- 目的
- 主な変更点
- 影響範囲
- 実行したテスト
- 未確認事項
- スクリーンショットまたは動画（UI 変更の場合）
- 関連 Issue / docs

PR で避けること:

- 仕様変更と大規模リファクタを同時に行う
- UI に solver ロジックを複製する
- API response shape をドキュメント更新なしに変える
- 単位や符号規約をテストなしに変える
- `NaN` / `Infinity` を JSON に出す
- 生成物や coverage HTML を理由なく更新する

## Coding Style

### Python

- Public function には型ヒントを付ける。
- Solver core では dataclass / typed structure を優先する。
- API 境界以外で巨大な untyped dict を広げない。
- 解析失敗は structured error として返す。
- 単位、符号、座標変換を変更する場合は仕様とテストを同時に更新する。

### TypeScript / React

- `npm run typecheck` が通る型定義を維持する。
- UI component、domain logic、API adapter を分離する。
- ユーザー表示文言は既存 i18n 方針に合わせる。
- Viewer は `project.json` と result JSON を入力として扱う。
- LINER の計算ロジックは React component に閉じ込めない。

### Documentation

- トップレベル文書は概要と導線を中心にする。
- 詳細仕様は `docs/` に置く。
- 既存仕様と実装が異なる場合は、同じ PR で関連 docs を更新する。
- 重複説明を増やさず、source of truth へのリンクを置く。

## Local Checks

Backend:

```bash
python -m pytest backend/tests -q
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Electron:

```bash
cd frontend
npm run electron:compile
npm run electron:build
```

環境により FastAPI TestClient や Electron / GPU 周辺が失敗する場合は、PR に環境制約と代替確認内容を記載してください。

## Quality Gate

詳細は [docs/12_quality_gate.md](docs/12_quality_gate.md) を参照してください。

重要なブロッカー:

- JSON に `NaN` / `Infinity` が含まれる
- solver error を成功として返す
- 単位や符号規約の無断変更
- Electron main process に解析ロジックを入れる
- WebGL 初期化失敗でアプリが白画面になる
- `legacy-desktop-gl` をデフォルト化する
- Result schema / API field name を docs 更新なしに変更する

## Issues

Issue には可能な範囲で次を含めてください。

- 期待した動作
- 実際の動作
- 再現手順
- 入力 JSON / サンプルモデル
- OS、Node.js、Python、ブラウザ/Electron 情報
- ログ、スクリーンショット、動画

## Discussions

次の内容は Issue より Discussion が向いています。

- 設計方針の相談
- 新しい解析機能の提案
- UI/UX の方向性
- CIM / IFC / LandXML など外部連携の検討
- ライセンスや公開運用の相談

## Security and Safety

構造解析ソフトウェアは結果の信頼性が重要です。脆弱性、データ破損、誤った解析結果につながる問題は、通常の UI 改善より優先して扱ってください。

現時点で専用のセキュリティポリシーは未整備です。公開前に `SECURITY.md` の追加を推奨します。
