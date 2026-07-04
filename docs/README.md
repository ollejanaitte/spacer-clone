# Documentation

このディレクトリは `spacer-clone` の詳細ドキュメント置き場です。GitHub の入口は [README.md](../README.md)、公開向けアーキテクチャ概要は [ARCHITECTURE.md](../ARCHITECTURE.md)、今後の計画は [ROADMAP.md](../ROADMAP.md) を参照してください。

## Recommended Reading

初めて読む場合は、次の順番を推奨します。

1. [../README.md](../README.md) - プロジェクト概要、機能、起動方法
2. [../ARCHITECTURE.md](../ARCHITECTURE.md) - システム構成と責務分離
3. [../ROADMAP.md](../ROADMAP.md) - Short / Mid / Long Term の開発計画
4. [../CONTRIBUTING.md](../CONTRIBUTING.md) - 開発参加ガイド
5. [12_quality_gate.md](12_quality_gate.md) - PR 品質基準
6. [liner/README.md](liner/README.md) - LINER の設計・実装状況

## Documentation Map

| Area | Location | Purpose |
| --- | --- | --- |
| Public overview | `../README.md` | GitHub トップページ向けの概要 |
| Architecture overview | `../ARCHITECTURE.md` | 全体構成、層、データフロー |
| Roadmap | `../ROADMAP.md` | 短期・中期・長期計画 |
| Contribution | `../CONTRIBUTING.md` | 開発フロー、PR、品質基準 |
| Core MVP specs | `02_*` - `12_*` | 入力、解析、API、UI、Viewer、帳票、品質基準 |
| Feature design | `design/` | 個別機能の設計メモ |
| LINER | `liner/` | 線形座標計算、マッピング、CAD/Report 出力 |
| Verification | `verification/` | 検証計画、検証結果、手動 smoke test |
| Development | `development/` | 開発ポリシー |
| Manual | `manual/` | ユーザー向け手順の配置先 |
| Images | `images/` | README / docs 用スクリーンショット |
| Roadmap details | `roadmap/` | 詳細ロードマップの配置先 |
| Handover / investigation | `handover/`, `investigation/`, `investigations/`, `level0/`, `lobby/`, `pr/` | 実装調査、引き継ぎ、PR メモ |

## Core Specifications

| Document | Role |
| --- | --- |
| [02_mvp_scope.md](02_mvp_scope.md) | MVP scope and decision criteria |
| [03_architecture.md](03_architecture.md) | Original MVP architecture specification |
| [04_input_schema.md](04_input_schema.md) | `project.json` input schema |
| [05_analysis_engine_spec.md](05_analysis_engine_spec.md) | Python analysis engine behavior |
| [06_result_schema.md](06_result_schema.md) | Analysis result JSON |
| [07_api_spec.md](07_api_spec.md) | FastAPI contract |
| [08_ui_spec.md](08_ui_spec.md) | React UI specification |
| [09_3d_view_spec.md](09_3d_view_spec.md) | Three.js viewer and fallback |
| [10_report_spec.md](10_report_spec.md) | JSON / CSV / HTML report output |
| [11_test_spec.md](11_test_spec.md) | Required verification cases |
| [12_quality_gate.md](12_quality_gate.md) | PR acceptance criteria |

## Feature Design Index

Representative design documents:

- [design/eigen-analysis.md](design/eigen-analysis.md)
- [design/response-spectrum-analysis.md](design/response-spectrum-analysis.md)
- [design/time-history-analysis.md](design/time-history-analysis.md)
- [design/influence-analysis.md](design/influence-analysis.md)
- [design/influence-engine.md](design/influence-engine.md)
- [design/bridge-model-wizard.md](design/bridge-model-wizard.md)
- [design/bridge-fem-generator.md](design/bridge-fem-generator.md)
- [design/model-comparison-view.md](design/model-comparison-view.md)
- [design/result-visualization.md](design/result-visualization.md)
- [design/report-drawing-output.md](design/report-drawing-output.md)
- [design/viewer-rendering-improvements.md](design/viewer-rendering-improvements.md)

## LINER

LINER の詳細は [liner/README.md](liner/README.md) が source of truth です。

Key documents:

- [liner/liner_scope.md](liner/liner_scope.md)
- [liner/domain_model.md](liner/domain_model.md)
- [liner/geometry_core.md](liner/geometry_core.md)
- [liner/intermediate_result_model.md](liner/intermediate_result_model.md)
- [liner/frame_model_mapping.md](liner/frame_model_mapping.md)
- [liner/integration_with_frame_model.md](liner/integration_with_frame_model.md)
- [liner/cad_output_spec.md](liner/cad_output_spec.md)
- [liner/test_plan_geometry.md](liner/test_plan_geometry.md)

## Verification

検証ドキュメント:

- [verification/spacer-comparison-plan.md](verification/spacer-comparison-plan.md)
- [verification/spacer-comparison-results.md](verification/spacer-comparison-results.md)
- [verification/bridge-model-generator.md](verification/bridge-model-generator.md)
- [verification/eigen-analysis-phase-e1b-verification.md](verification/eigen-analysis-phase-e1b-verification.md)
- [verification/eigen-analysis-phase-e1c-verification.md](verification/eigen-analysis-phase-e1c-verification.md)
- [verification/time-history-known-limitations.md](verification/time-history-known-limitations.md)
- [verification/time-history-performance-note.md](verification/time-history-performance-note.md)

## Runtime and Packaging

- [run-ubuntu.md](run-ubuntu.md)
- [exe-build-windows.md](exe-build-windows.md)
- [../desktop/electron/README.md](../desktop/electron/README.md)

## Documentation Maintenance Rules

- Top-level documents should explain project purpose, current status, and navigation.
- Deep technical details should live under `docs/`.
- Do not duplicate long specifications in multiple files; link to the source of truth.
- If implementation behavior changes, update the relevant design/specification document in the same PR.
- Handover and investigation notes are historical context. Promote durable decisions into design/spec documents when they become authoritative.
