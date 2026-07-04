# spacer-clone

`spacer-clone` は、橋梁・土木構造物向けの 3D フレーム解析、結果可視化、線形座標計算、レポート/エクスポートを統合するデスクトップ志向の OSS プロジェクトです。

JIP-SPACER / JIP-LINER で扱われるような構造解析・線形計算ワークフローを参考にしつつ、独自のデータモデル、UI、解析エンジン、出力仕様として実装しています。現在はプレビュー段階で、線形静的解析、動的解析の基礎機能、橋梁モデル生成、LINER 機能、DXF/SVG 系エクスポートの実装と検証を進めています。

## Project Status

| 項目 | 状態 |
| --- | --- |
| バージョン | `0.3.0-preview` |
| 開発段階 | Preview / active development |
| 主な対象 | 3D フレーム解析、橋梁モデル生成、線形座標計算、結果可視化 |
| UI | React + Vite + Electron |
| API / Solver | FastAPI + Python |
| ライセンス | 未設定。OSS 公開前に `LICENSE` を追加してください。 |

> Note: 解析結果は検証用モデルと回帰テストで確認されていますが、設計実務での利用には追加検証が必要です。

## Screenshots

スクリーンショットは `docs/images/` に配置します。現時点では画像プレースホルダーを用意しています。

<!-- screenshot: docs/images/app-overview.png -->
<!-- screenshot: docs/images/analysis-results.png -->
<!-- screenshot: docs/images/liner-workflow.png -->
<!-- screenshot: docs/images/dxf-export.png -->

## Features

- 3D フレームモデルの入力、検証、保存、読込
- 線形静的解析と結果テーブル表示
- 変位、反力、部材力の CSV / PDF 帳票出力
- Three.js / react-three-fiber による 3D 表示、変形図、アニメーション
- 固有値解析、応答スペクトル解析、時刻歴応答解析のプレビュー実装
- 影響線解析、移動荷重解析の API / エンジン基盤
- 橋梁ドメインモデルから FEM モデルを生成する Bridge Wizard
- LINER による平面線形、縦断、横断、グリッド、フレームモデル連携
- SVG / DXF 系の CAD 出力実験
- Electron デスクトップアプリと GPU 互換モード
- Vitest、Playwright、pytest による回帰テスト

## Analysis Capabilities

### Linear Static Analysis

`backend/engine` のフレーム解析エンジンが、節点、部材、支点、荷重ケースから剛性行列を組み立て、変位、反力、部材端力を計算します。

主な出力:

- 節点変位
- 支点反力
- 部材力
- CSV エクスポート
- PDF 帳票用 HTML
- 3D Viewer の変形表示

### Eigen Analysis

質量ケースを使った固有値解析を実装しています。自然振動数、周期、モード形状、有効質量比を扱います。

関連ドキュメント:

- [docs/design/eigen-analysis.md](docs/design/eigen-analysis.md)
- [docs/verification/eigen-analysis-phase-e1b-verification.md](docs/verification/eigen-analysis-phase-e1b-verification.md)
- [docs/verification/eigen-analysis-phase-e1c-verification.md](docs/verification/eigen-analysis-phase-e1c-verification.md)

### Response Spectrum Analysis

固有値解析結果を使い、応答スペクトル解析を実行します。SRSS / CQC、線形補間、log-log 補間の検証モデルがあります。

関連ドキュメント:

- [docs/design/response-spectrum-analysis.md](docs/design/response-spectrum-analysis.md)
- [examples/README.md](examples/README.md)

### Time History Analysis

Newmark-beta 法による時刻歴応答解析を実装しています。X / Y / Z の 3 方向地震波入力、Resultant 表示、グラフ、CSV / PNG 出力、3D 応答アニメーションを扱います。

関連ドキュメント:

- [docs/spec/th-analysis-revision-2026-06.md](docs/spec/th-analysis-revision-2026-06.md)
- [docs/design/time-history-analysis.md](docs/design/time-history-analysis.md)
- [docs/release-notes/time-history-preview.md](docs/release-notes/time-history-preview.md)

### Influence Line and Moving Load

影響線解析と移動荷重解析のエンジン/API/CSV 出力が実装されています。橋梁活荷重の自動配置や高度な包絡処理は今後の拡張対象です。

関連ドキュメント:

- [docs/design/influence-analysis.md](docs/design/influence-analysis.md)
- [docs/design/influence-engine.md](docs/design/influence-engine.md)
- [docs/design/influence-moving-load.md](docs/design/influence-moving-load.md)

## LINER

LINER は、線形座標計算とフレームモデル生成を担う機能モジュールです。

主な範囲:

- 平面線形の入力とサンプリング
- 縦断線形、勾配、標高計算
- 横断テンプレート、横断勾配、グリッド点生成
- station / chainage の管理
- 中間結果モデルを経由した再計算
- 生成した節点・部材・支点の `project.json` へのマッピング
- 2D プレビュー、マッピングレビュー、Viewer3D 確認
- LINER プロジェクト保存、読込、インポータ基盤

実装は `frontend/src/liner/`、設計ドキュメントは [docs/liner/README.md](docs/liner/README.md) にあります。

## DXF Export

DXF Export は、LINER の CAD 出力および解析結果出力の拡張として整備中です。

現在の位置付け:

- LINER の plan/profile DXF 出力実装が `frontend/src/liner/exports/` に存在
- Maker.js / `dxf-parser` を使ったテストと実験を含む
- 仕様上の安定ターゲットは `docs/liner/cad_output_spec.md` で管理
- SVG 出力を基礎仕様としつつ、DXF subset の品質改善を継続

関連ドキュメント:

- [docs/liner/cad_output_spec.md](docs/liner/cad_output_spec.md)
- [docs/design/report-drawing-output.md](docs/design/report-drawing-output.md)

## Technology Stack

| Layer | Technology |
| --- | --- |
| Desktop | Electron |
| Frontend | React, TypeScript, Vite |
| 3D Viewer | Three.js, react-three-fiber, drei |
| Charts | Recharts |
| CAD / Geometry | Maker.js, JSCAD utilities |
| Backend API | FastAPI |
| Solver Core | Python |
| Schema | JSON Schema |
| Frontend Tests | Vitest, Playwright |
| Backend Tests | pytest |
| Packaging | electron-builder, PyInstaller path for backend executable |

## Repository Structure

```text
backend/
  app/              FastAPI endpoints, reports, project storage API
  engine/           analysis engine, solvers, bridge FEM generator
  tests/            pytest verification and API tests
desktop/
  electron/         Electron main/preload process and GPU mode handling
docs/
  design/           feature design notes
  liner/            LINER design, gates, release notes
  verification/     verification reports and manual smoke tests
  development/      development policies
  images/           README screenshot placeholders
examples/
  verification/     structural verification models
  liner/            LINER fixtures and expected intermediate results
frontend/
  src/              React application, viewer, LINER, bridge wizard, exports
schemas/            project/result/bridge/generated FEM JSON Schemas
scripts/            build and source hygiene helper scripts
```

## Quick Start

### Windows

```powershell
.\start-windows.ps1
```

### macOS

```bash
./start-mac.sh
```

### Ubuntu / WSL

```bash
./start-ubuntu.sh
```

Web UI のみを起動する場合:

```bash
./start-ubuntu.sh --web
```

詳細は [docs/run-ubuntu.md](docs/run-ubuntu.md) と [docs/exe-build-windows.md](docs/exe-build-windows.md) を参照してください。

## Development

バックエンド:

```bash
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
python -m pytest backend/tests -q
```

フロントエンド:

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
npm run electron:dev
npm run electron:build
```

開発参加の詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## Documentation

主要ドキュメント:

- [ARCHITECTURE.md](ARCHITECTURE.md) - システム構成と責務分離
- [ROADMAP.md](ROADMAP.md) - Short / Mid / Long Term の開発計画
- [CHANGELOG.md](CHANGELOG.md) - 主要変更履歴
- [CONTRIBUTING.md](CONTRIBUTING.md) - 開発参加ガイド
- [docs/README.md](docs/README.md) - 詳細ドキュメント索引
- [docs/liner/README.md](docs/liner/README.md) - LINER ドキュメント索引

## Development Status

現在は、構造解析 MVP から橋梁・LINER 統合へ拡張している段階です。

安定化済み/実装済みの主な領域:

- 静的解析の基礎エンジン
- 結果スキーマと CSV/PDF 系出力
- 3D Viewer と表示サイズ調整
- 固有値解析、応答スペクトル解析、時刻歴解析のプレビュー
- 影響線・移動荷重解析の基盤
- Bridge Wizard / FEM 生成 API
- LINER Phase 3.x 系のコア、UI、インポータ、保存/読込

継続中の主な領域:

- LINER 完成度向上
- DXF Export の仕様固定と品質改善
- UI/UX と大規模モデル表示の改善
- 解析モデル生成と検証ケースの拡充
- OSS としてのライセンス、リリース、CI 整備

今後の詳細は [ROADMAP.md](ROADMAP.md) を参照してください。

## License

このリポジトリには現時点で `LICENSE` ファイルがありません。企業レベルの OSS として公開する前に、MIT、Apache-2.0、GPL 系などの採用ライセンスを明示してください。
