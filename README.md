# spacer-clone

**A verification-first open-source bridge engineering platform for structural analysis, road alignment, 3D visualization, and reproducible design workflows.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.3.0--preview-blue.svg)](https://github.com/ollejanaitte/spacer-clone/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%20%2B%20Electron-3178C6.svg)](frontend/package.json)
[![Python](https://img.shields.io/badge/Python-FastAPI%20solver-3776AB.svg)](backend/)

`spacer-clone` brings together frame analysis, bridge model generation, road-alignment geometry, interactive 3D review, and engineering exports in one inspectable [MIT-licensed](LICENSE) codebase.

The project addresses a persistent gap in civil and bridge engineering: critical workflows are often fragmented across proprietary tools, opaque file formats, and discipline-specific applications. `spacer-clone` is building a transparent, testable, and extensible foundation that engineers, researchers, educators, and open-source contributors can inspect, validate, and improve together.

> [!CAUTION]
> This repository is under active development. Numerical design authorization is not granted for production bridge design. Existing analysis and geometry workflows are intended for development, verification, research, and educational use unless a module explicitly documents a stronger validation status.

## Overview

`spacer-clone` is a desktop/web-oriented engineering toolkit that combines:

- 3D frame FEM input, validation, save/reload, and result review
- a Python analysis engine behind a FastAPI boundary
- Apollo bridge-domain modeling for inspectable geometry and design-entity contracts
- LINER road-alignment geometry and mapping into frame models
- interactive Three.js visualization and CAD/report-oriented exports

It is inspired by common Japanese road-bridge practice, but the implementation uses vendor-neutral schemas, stable entity IDs, stale-result detection, and fail-closed validation so contributors can reason about behavior from the source and tests.

## Why this project matters

Bridge and civil engineering software is specialized, and many workflows split analysis, alignment geometry, 3D review, and reporting across separate proprietary products. That makes independent inspection, regression testing, and cross-team verification harder than they should be.

`spacer-clone` does not claim to replace commercial design suites. Its value is a public, layered foundation where:

- data models and calculation boundaries are readable
- geometry and analysis contracts can be tested
- verification evidence can live next to the code
- educators, researchers, and practitioners can contribute without opaque binaries

Maintaining this stack spans TypeScript/React/Three.js/Electron, FastAPI/Python solvers, JSON schemas, 3D visualization, CAD/export paths, documentation, PR review, and numerical verification evidence. Clear English entry points and concrete contribution paths lower that maintenance barrier for international collaborators.

## What works today

- 3D frame-model creation, validation, persistence, and interactive review
- Linear static analysis with displacements, reactions, and member forces
- Preview workflows for eigenvalue, response-spectrum, and time-history analysis
- Influence-line and moving-load API/engine foundations (UI and envelope workflows still evolving)
- Apollo bridge-model generation for simple single-span and continuous-girder vertical slices (automated tests green; manual GUI confirmation still pending)
- Road-alignment geometry through the LINER module, including save/reload and importer foundations
- CSV, PDF-oriented report HTML, SVG, DXF, and STL-oriented export workflows (DXF quality remains under active improvement)
- Schema-driven project data, stable entity IDs, stale-result detection, and fail-closed validation
- Automated regression coverage with Vitest, Playwright, and pytest across frontend, backend, import/export, and visualization layers

## Engineering principles

- Keep UI, API, solver, viewer, and export responsibilities separated ([ARCHITECTURE.md](ARCHITECTURE.md))
- Prefer schema-validated project/result documents over ad-hoc state
- Preserve stable design-entity IDs across regeneration where contracts require it
- Mark generated results stale when inputs change; do not silently overwrite authority
- Fail closed on unsupported scope, invalid input, and unauthorized numeric design adoption
- Treat verification fixtures and documentation as first-class deliverables

## Current limitations and safety status

| Topic | Status |
| --- | --- |
| Geometry / data-model features | Implemented for supported Apollo and LINER scopes; scope guards reject unsupported cases |
| Analysis | Linear static is the primary implemented path; dynamic/influence workflows are preview or foundational |
| Automated regression | Active across frontend/backend modules; passing tests do not equal design authorization |
| Manual GUI verification | Pending user confirmation for Apollo simple-single and continuous-girder checklists |
| Numerical design authorization | **Not granted** (`NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`) |
| Production bridge design use | **Not authorized** |
| MIT warranty disclaimer | Applies as stated in [LICENSE](LICENSE); it is separate from engineering authorization gates |

## Who this is for

- Structural and bridge engineers exploring open, inspectable workflows
- Researchers and educators who need reproducible geometry/analysis examples
- Open-source contributors interested in solvers, 3D, CAD/export, schemas, or docs
- Maintainers reviewing cross-layer changes in a multi-language engineering codebase

## Ways to contribute

Concrete contribution areas:

- verification cases and golden fixtures
- solver validation and numerical evidence packages
- bridge-domain modeling (Apollo contracts, generation, quantities)
- 3D visualization and selection/highlight behavior
- road-alignment geometry (LINER)
- CAD/export interoperability (SVG/DXF/STL/report outputs)
- accessibility and UI clarity
- documentation and translation
- CI/release engineering
- security and compatibility review

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch, commit, PR, and testing expectations.

## Quick start

### Prerequisites

- Node.js and npm (frontend / Electron)
- Python 3 with project dependencies for the FastAPI backend and solver
- OS support via the scripts below (Windows, macOS, Ubuntu/WSL)

### Run the app

#### Windows

```powershell
.\start-windows.ps1
```

#### macOS

```bash
./start-mac.sh
```

#### Ubuntu / WSL

```bash
./start
./start-ubuntu.sh
```

Default startup includes the Apollo non-numeric entry. To make that explicit:

```bash
./start --apollo
./start-ubuntu.sh --apollo
```

Web UI only:

```bash
./start-ubuntu.sh --web
```

More detail: [docs/run-ubuntu.md](docs/run-ubuntu.md), [docs/exe-build-windows.md](docs/exe-build-windows.md).

### Development commands

Backend:

```bash
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
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

Frontend test gates (see [docs/development/vitest-gates.md](docs/development/vitest-gates.md)):

```bash
npm run test:fast      # pure logic (node)          ~35 s
npm run test:ui        # React / DOM (jsdom)        ~46 s
npm run test:3d        # Three.js / Canvas          ~6 s
npm run test:slow      # heavy integration E2E      ~64 s
npm run test:electron  # desktop/electron           <1 s
npm run test:full      # FAST+UI+3D+SLOW+Electron+regression+parity (final gate)
```

Use `test:fast` + `typecheck` for routine pure-logic changes; run `test:full` only at milestone completion.

Electron:

```bash
cd frontend
npm run electron:dev
npm run electron:build
```

## Architecture at a glance

```text
React / Electron UI  ->  FastAPI  ->  Python solver / bridge FEM
        |                                 |
   Three.js viewer                   project.json + result schemas
        |
   LINER + Apollo bridge modeling + CSV/PDF/SVG/DXF/STL exports
```

Layer responsibilities and endpoint map: [ARCHITECTURE.md](ARCHITECTURE.md).

## Project status

| Area | Status | Evidence / Notes |
| --- | --- | --- |
| Core frame analysis | Implemented | Linear static engine; displacements, reactions, member forces |
| Dynamic analysis | Preview | Eigenvalue, response-spectrum, time-history preview paths |
| Influence / moving load | Foundational | API/engine present; advanced envelope/UI still evolving |
| Apollo bridge modeling | Implemented (scoped) | Design-entity contracts, generation, STALE, fail-closed scope |
| Simple single-span workflow | Implemented | Sample input + automated workflow tests; manual GUI pending |
| Continuous-girder vertical slice | Implemented | Scope/docs/contracts/UI/3D/STL slice; formal continuous analysis not included; manual GUI pending |
| LINER | Implemented / evolving | Alignment geometry, mapping, save/reload, importer foundations |
| CAD / export | Implemented / improving | CSV, PDF-oriented HTML, SVG, DXF, STL-oriented paths; DXF quality ongoing |
| Automated tests | Active | Vitest, Playwright, pytest regression suites |
| Manual GUI verification | Pending | Apollo checklists marked `PENDING_USER_CONFIRMATION` |
| Numerical design authorization | Not authorized | `NOT_GRANTED` / blocked pending human evidence |
| License | MIT | See [LICENSE](LICENSE) |
| Version | `0.3.0-preview` | Active development / preview stage |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — system layers and responsibilities
- [ROADMAP.md](ROADMAP.md) — short / mid / long-term plan
- [CHANGELOG.md](CHANGELOG.md) — notable changes
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution guide
- [docs/README.md](docs/README.md) — documentation index
- [docs/apollo/](docs/apollo/) — Apollo bridge-domain docs
- [docs/liner/README.md](docs/liner/README.md) — LINER docs
- [docs/verification/](docs/verification/) — verification notes

## License

This project is licensed under the MIT License.
See [LICENSE](LICENSE) for details.

The MIT text provides the software **as is**, without warranty. Independently of that legal disclaimer, **numerical design authorization is not granted** for production bridge design in this repository.

---

## Japanese / 日本語

`spacer-clone` は、橋梁・土木構造物向けの 3D フレーム解析、結果可視化、線形座標計算、レポート/エクスポートを統合した三次元のFEM解析および道路線形作成ソフトです。MIT License のオープンソースとして公開しています。

我が国日本の一般的な道路橋の構造解析・線形計算の設計を参考にしつつ、独自のデータモデル、UI、解析エンジン、出力仕様として実装しています。現在はプレビュー段階で、線形静的解析、動的解析の基礎機能、橋梁モデル生成、LINER 機能、DXF/SVG 系エクスポートの実装と検証を進めています。

> [!CAUTION]
> 本リポジトリは活発に開発中です。数値設計権限（`NUMERIC_DESIGN_AUTHORIZATION`）は未付与であり、生産的な橋梁設計実務での正式利用は認可されていません。解析・幾何ワークフローは、モジュールがより強い検証状態を明示しない限り、開発・検証・研究・教育用途を想定しています。

### プロジェクト状況

| 項目 | 状態 |
| --- | --- |
| バージョン | `0.3.0-preview` |
| 開発段階 | Preview / active development |
| 主な対象 | 3D フレーム解析、橋梁モデル生成、線形座標計算、結果可視化 |
| UI | React + Vite + Electron |
| API / Solver | FastAPI + Python |
| ライセンス | MIT（[LICENSE](LICENSE)） |
| 数値設計権限 | NOT_GRANTED |
| 手動 GUI 確認 | PENDING_USER_CONFIRMATION（Apollo 単径間・連続桁） |

### Screenshots

スクリーンショットは `docs/images/` に配置します。現時点では画像プレースホルダーを用意しています。

<!-- screenshot: docs/images/app-overview.png -->
<!-- screenshot: docs/images/analysis-results.png -->
<!-- screenshot: docs/images/liner-workflow.png -->
<!-- screenshot: docs/images/dxf-export.png -->

### Features

- 3D フレームモデルの入力、検証、保存、読込
- 線形静的解析と結果テーブル表示
- 変位、反力、部材力の CSV / PDF 帳票出力
- Three.js / react-three-fiber による 3D 表示、変形図、アニメーション
- 固有値解析、応答スペクトル解析、時刻歴応答解析のプレビュー実装
- 影響線解析、移動荷重解析の API / エンジン基盤
- Apollo による単径間単純桁・連続桁 vertical slice（自動テスト済み、手動 GUI は pending）
- 橋梁ドメインモデルから FEM モデルを生成する Bridge Wizard
- LINER による平面線形、縦断、横断、グリッド、フレームモデル連携
- SVG / DXF 系の CAD 出力実験
- Electron デスクトップアプリと GPU 互換モード
- Vitest、Playwright、pytest による回帰テスト

### Analysis Capabilities

#### Linear Static Analysis

`backend/engine` のフレーム解析エンジンが、節点、部材、支点、荷重ケースから剛性行列を組み立て、変位、反力、部材端力を計算します。

主な出力:

- 節点変位
- 支点反力
- 部材力
- CSV エクスポート
- PDF 帳票用 HTML
- 3D Viewer の変形表示

#### Eigen Analysis

質量ケースを使った固有値解析を実装しています。自然振動数、周期、モード形状、有効質量比を扱います。

関連ドキュメント:

- [docs/design/eigen-analysis.md](docs/design/eigen-analysis.md)
- [docs/verification/eigen-analysis-phase-e1b-verification.md](docs/verification/eigen-analysis-phase-e1b-verification.md)
- [docs/verification/eigen-analysis-phase-e1c-verification.md](docs/verification/eigen-analysis-phase-e1c-verification.md)

#### Response Spectrum Analysis

固有値解析結果を使い、応答スペクトル解析を実行します。SRSS / CQC、線形補間、log-log 補間の検証モデルがあります。

関連ドキュメント:

- [docs/design/response-spectrum-analysis.md](docs/design/response-spectrum-analysis.md)
- [examples/README.md](examples/README.md)

#### Time History Analysis

Newmark-beta 法による時刻歴応答解析を実装しています。X / Y / Z の 3 方向地震波入力、Resultant 表示、グラフ、CSV / PNG 出力、3D 応答アニメーションを扱います。

関連ドキュメント:

- [docs/spec/th-analysis-revision-2026-06.md](docs/spec/th-analysis-revision-2026-06.md)
- [docs/design/time-history-analysis.md](docs/design/time-history-analysis.md)
- [docs/release-notes/time-history-preview.md](docs/release-notes/time-history-preview.md)

#### Influence Line and Moving Load

影響線解析と移動荷重解析のエンジン/API/CSV 出力が実装されています。橋梁活荷重の自動配置や高度な包絡処理は今後の拡張対象です。

関連ドキュメント:

- [docs/design/influence-analysis.md](docs/design/influence-analysis.md)
- [docs/design/influence-engine.md](docs/design/influence-engine.md)
- [docs/design/influence-moving-load.md](docs/design/influence-moving-load.md)

### LINER

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

### DXF Export

DXF Export は、LINER の CAD 出力および解析結果出力の拡張として整備中です。

現在の位置付け:

- LINER の plan/profile DXF 出力実装が `frontend/src/liner/exports/` に存在
- Maker.js / `dxf-parser` を使ったテストと実験を含む
- 仕様上の安定ターゲットは `docs/liner/cad_output_spec.md` で管理
- SVG 出力を基礎仕様としつつ、DXF subset の品質改善を継続

関連ドキュメント:

- [docs/liner/cad_output_spec.md](docs/liner/cad_output_spec.md)
- [docs/design/report-drawing-output.md](docs/design/report-drawing-output.md)

### Technology Stack

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

### Repository Structure

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

### Quick Start（日本語）

#### Windows

```powershell
.\start-windows.ps1
```

#### macOS

```bash
./start-mac.sh
```

#### Ubuntu / WSL

```bash
./start
./start-ubuntu.sh
```

既定で Apollo Phase 1-NN の非Numeric入口を含む標準起動になります。互換目的で明示する場合:

```bash
./start --apollo
./start-ubuntu.sh --apollo
```

Web UI のみを起動する場合:

```bash
./start-ubuntu.sh --web
```

詳細は [docs/run-ubuntu.md](docs/run-ubuntu.md) と [docs/exe-build-windows.md](docs/exe-build-windows.md) を参照してください。

### Development

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

### Documentation（日本語）

主要ドキュメント:

- [ARCHITECTURE.md](ARCHITECTURE.md) - システム構成と責務分離
- [ROADMAP.md](ROADMAP.md) - Short / Mid / Long Term の開発計画
- [CHANGELOG.md](CHANGELOG.md) - 主要変更履歴
- [CONTRIBUTING.md](CONTRIBUTING.md) - 開発参加ガイド
- [docs/README.md](docs/README.md) - 詳細ドキュメント索引
- [docs/liner/README.md](docs/liner/README.md) - LINER ドキュメント索引
- [docs/apollo/](docs/apollo/) - Apollo 橋梁ドメイン

### Development Status

現在は、構造解析 MVP から橋梁・LINER 統合へ拡張している段階です。

安定化済み/実装済みの主な領域:

- 静的解析の基礎エンジン
- 結果スキーマと CSV/PDF 系出力
- 3D Viewer と表示サイズ調整
- 固有値解析、応答スペクトル解析、時刻歴解析のプレビュー
- 影響線・移動荷重解析の基盤
- Bridge Wizard / FEM 生成 API
- Apollo 単径間・連続桁 vertical slice（自動検証済み）
- LINER Phase 3.x 系のコア、UI、インポータ、保存/読込

継続中の主な領域:

- LINER 完成度向上
- DXF Export の仕様固定と品質改善
- UI/UX と大規模モデル表示の改善
- 解析モデル生成と検証ケースの拡充
- 手動 GUI 確認と数値設計証跡の整備
- CI 標準化とリリース工程の強化

今後の詳細は [ROADMAP.md](ROADMAP.md) を参照してください。

### License（日本語）

本プロジェクトは MIT License です。詳細は [LICENSE](LICENSE) を参照してください。

MIT の無保証条項とは別に、本リポジトリでは数値設計権限が未付与であり、生産的な橋梁設計実務での正式利用は認可されていません。
