# STEP 1 — 上部工設計計算ツール 全設計書監査・修正・Design Freeze

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工（superstructure）一気通貫実装
> **Scope:** Phase 6-2 Bridge Geometry → Phase 6-3 3D Model → Phase 6-4 RB-001 完全再現
>            → Phase 7 上部工設計計算エンジン → Phase 8 自動設計・出力 → Phase 9 UI統合・製品化
> **Status:** STEP 1（設計監査・修正・Design Freeze。production implementation は行わない）

## 目的

STEP 2 で本実装、STEP 3 で UI 統合・Project Replay・最終製品検証を完走できるよう、
実装前に必要な全設計書・契約・接続仕様・UI 仕様・検証仕様を監査・修正し **Design Freeze** する。
手戻りゼロを最優先とする。

## 前提（実査に基づく現在地）

- `main` baseline SHA: `8598d65ec6ef7fa2af0e5a6a3baf3abb4b506e92`
- **Phase 6-0**: COMPLETE / SEALED（`SEAL-RB-S10-001-P6-0`）
- **Phase 6-1 Geometry Core**: COMPLETE（`frontend/src/apollo/geometry/`、36 tests PASS）
- 構造解析: 3D Euler–Bernoulli フレーム solver（`backend/engine/`）実装済み
  （linear static / eigen / influence / moving-load / response-spectrum / time-history）
- 上部工設計計算エンジン: **未実装**（全数値 `NOT_AUTHORIZED` / `NOT_GRANTED`）
- 3D: `frontend/src/viewer`（imperative Three.js）+ `frontend/src/substructure`（R3F）
- UI: `frontend/src/App.tsx` ルーティング / `ApolloPhase1Shell`（guided + list）
- 出力: drawing / report / quantity / DXF / STL（development ゲート付き）
- CI: GitHub Actions なし（frontend `tsc`/`vitest`/`playwright`、backend `pytest`）

## 成果物一覧（18 deliverables ⇔ 本ディレクトリ）

| # | Deliverable | 文書 | PR |
|---|-------------|------|----|
| 1 | MASTER_ARCHITECTURE | `STEP1_P01_MASTER_ARCHITECTURE.md` | P01 |
| 2 | IMPLEMENTATION_SEQUENCE | `STEP1_P01_IMPLEMENTATION_SEQUENCE.md` | P01 |
| 3 | DATA_MODEL_SCHEMA_MATRIX | `STEP1_P02_DATA_MODEL_MATRIX.md` | P02 |
| 4 | COORDINATE_UNIT_CONTRACT | `STEP1_P02_COORDINATE_UNIT_CONTRACT.md` | P02 |
| 5 | INTERFACE_CONNECTOR_MATRIX | `STEP1_P03_CONNECTOR_MATRIX.md` | P03 |
| 6 | API_DATAFLOW_MATRIX | `STEP1_P03_API_DATAFLOW_MATRIX.md` | P03 |
| 7 | CALCULATION_RULE_MATRIX | `STEP1_P05_CALCULATION_RULE_MATRIX.md` | P05 |
| 8 | UI_SCREEN_MATRIX | `STEP1_P06_UI_SCREEN_MATRIX.md` | P06 |
| 9 | UI_BUTTON_ACTION_MATRIX | `STEP1_P06_UI_BUTTON_ACTION_MATRIX.md` | P06 |
| 10 | 3D_CONTRACT | `STEP1_P04_3D_CONTRACT.md` | P04 |
| 11 | OUTPUT_MATRIX | `STEP1_P07_OUTPUT_MATRIX.md` | P07 |
| 12 | GOLDEN_MASTER_REPLAY_SPEC | `STEP1_P07_GOLDEN_REPLAY_SPEC.md` | P07 |
| 13 | TEST_ACCEPTANCE_MATRIX | `STEP1_P08_TEST_ACCEPTANCE_MATRIX.md` | P08 |
| 14 | ERROR_HOLD_TRACEABILITY_SPEC | `STEP1_P08_ERROR_HOLD_TRACEABILITY.md` | P08 |
| 15 | RISK_DEPENDENCY_BACKLOG | `STEP1_P09_RISK_BACKLOG.md` | P09 |
| 16 | STEP2_IMPLEMENTATION_HANDOFF | `STEP1_P10_STEP2_HANDOFF.md` | P10 |
| 17 | STEP3_INTEGRATION_HANDOFF | `STEP1_P10_STEP3_HANDOFF.md` | P10 |
| 18 | DESIGN_FREEZE / IMPLEMENTATION_READY | `STEP1_P11_DESIGN_FREEZE_REPORT.md` | P11 |

## Phase 設計文書（P04/P05 で Phase 6-2..8 の設計を確定）

- `STEP1_P04_BRIDGE_GEOMETRY.md`（Phase 6-2）
- `STEP1_P04_3D_CONTRACT.md`（Phase 6-3）
- `STEP1_P05_ANALYSIS_DESIGN_ARCHITECTURE.md`（Phase 6-4 / Phase 7 / Phase 8）

## PR 計画（各 PR は main へ merge）

- P00: baseline / inventory / scope freeze（本PR）
- P01: master architecture + implementation sequence
- P02: data model / schema matrix + coordinate-unit contract
- P03: interface / connector matrix + API dataflow matrix
- P04: Bridge Geometry（Phase 6-2）+ 3D contract（Phase 6-3）
- P05: analysis/design calc architecture + calculation rule matrix（Phase 6-4/7/8）
- P06: UI screen matrix + UI button/action matrix（Phase 9）
- P07: output matrix + golden master / replay spec
- P08: test / acceptance matrix + error / hold traceability spec
- P09: risk / dependency / backlog
- P10: STEP 2 / STEP 3 implementation handoff
- P11: master validator + Design Freeze / IMPLEMENTATION_READY report

## 作業ルール

- 本 STEP では production 実装・UI 本実装・大規模リファクタは禁止。
- 既存設計書（phase6_0 契約群・Phase A / DS-00..09・3d-stl・frame）を正本とし、不足・矛盾のみ修正。
- 根拠のない Golden 生成・未解決値の推測確定は禁止。
- 設計監査用の validator / schema-check / docs test / fixture 検証ツールのみ追加可。
