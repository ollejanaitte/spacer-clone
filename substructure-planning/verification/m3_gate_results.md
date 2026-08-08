# Phase C1 Milestone 3 統合検証結果（M3 Gate Results）

実施日時: 2026-08-08
対象: Phase C1 Milestone 3 — 設計仕様Freeze / 永続化 / 上部工接続・3D統合 / 設計計算フレームワーク / 耐震・配筋 / 結果UI / 統合E2E
方法: vitest 全スイート + Playwright E2E（M3 統合 8シナリオ + 既存 substructure/LINER e2e）+ typecheck + production build + 視覚証跡
正本: substructure-planning/docs/phase-c1/PHASE_C1_M3_SPEC_FREEZE.md + PHASE_C1_M3_DESIGN_BASIS_REGISTER.csv

## 1. 総括

| カテゴリ | 結果 |
|---|---|
| 設計仕様 Freeze | PASS（M3-00, PR #630） |
| インフラ gate（永続化/接続/3D/結果UI/E2E/build） | PASS |
| 数値設計 gate（安定/部材/基礎/杭/耐震/配筋） | HOLD_NOT_AVAILABLE（根拠未 ADOPTED） |
| substructure 単体 | 多数テスト PASS |
| 全体リグレッション | 383ファイル / 2957テスト PASS |
| 専用 E2E | substructure 系 21 PASS（M3 統合 8 含む） |
| GitHub CI | N/A_WITH_REASON（repo に workflow 未設定） |

## 2. M3 Gate 検証結果

| gate | 結果 | 根拠 |
|---|---|---|
| M3_SPEC_FREEZE | PASS | PHASE_C1_M3_SPEC_FREEZE.md（PR #630） |
| M3_PROJECT_SAVE | PASS | persistence.ts / E2E（PR #641） |
| M3_PROJECT_LOAD | PASS | 同上（fail-closed） |
| M3_SCHEMA_ROUNDTRIP | PASS | 同上（Save→Reload→Load→2D/3D復元） |
| M3_BEARING_SUPPORT_CONNECTOR | PASS | superstructureInterface.ts / bearingSeatsToModel（PR #653） |
| M3_SUPERSTRUCTURE_SUBSTRUCTURE_3D | PASS | superstructureEnvelope.ts + extraGroups 同一シーン（PR #653） |
| M3_DESIGN_ENGINE | PASS | designEngine.ts フレームワーク（PR #659） |
| M3_PIER_DESIGN | HOLD_NOT_AVAILABLE | 数値根拠未 ADOPTED（DS-04/05） |
| M3_ABUTMENT_DESIGN | HOLD_NOT_AVAILABLE | 同上 |
| M3_FOUNDATION_DESIGN | HOLD_NOT_AVAILABLE | 同上 |
| M3_PILE_DESIGN | HOLD_NOT_AVAILABLE | 同上 |
| M3_SEISMIC_DESIGN | HOLD_NOT_AVAILABLE | 耐震設計法未 ADOPTED（PR #663 はフレームワーク） |
| M3_REBAR_DESIGN | HOLD_NOT_AVAILABLE | 配筋ルール未 ADOPTED（PR #663 はフレームワーク） |
| M3_RESULT_TRACEABILITY | PASS | inputTrace / requiredEvidence / sheet（PR #659/#666） |
| M3_RESULT_UI | PASS | DesignResultPanel（OK/NG/HOLD 明示）（PR #666） |
| M3_CALCULATION_OUTPUT | PASS | 計算書CSV/JSON（PR #666） |
| M3_E2E | PASS | substructure 系 21 e2e PASS |
| M3_REGRESSION | PASS | 383ファイル / 2957テスト PASS |
| M3_BUILD | PASS | typecheck + vite build PASS |
| M3_VISUAL_VERIFICATION | PASS | evidence/m3-01..m3-05 各PNG + 統合シーン |
| M3_REFERENCE_VALIDATION | PASS | Reference Bridge 001 反力を入力データとして接続検証（reaction_candidate.csv 由来） |
| M3_CI | N/A_WITH_REASON | repo に workflow 未設定のため（ローカルで全チェック実施） |

## 3. Critical Gate

Critical gate に相当する数値設計 gate（PIER/ABUTMENT/FOUNDATION/PILE/SEISMIC/REBAR DESIGN）は
**全て HOLD_NOT_AVAILABLE**。原因は設計数値（荷重係数・許容値・照査式・耐震設計法・配筋ルール）が
repo ガバナンス（DS-00..09 / numeric_value_governance）で `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`
のため ADOPTED されていないこと。M3-00 Freeze およびスーパーバイザ決定（Framework + HOLD, gate=NO）に従い、
ダミー式・仮定式では実装しない。

## 4. 判定

- インフラ gate（永続化/接続/3D/結果UI/E2E/build/reference）は全て PASS
- 数値設計 gate は HOLD_NOT_AVAILABLE（根拠未 ADOPTED）
- Critical Gate に HOLD があるため:
  **PHASE_C1_MILESTONE3_COMPLETE: NO**

## 5. 再開条件（数値設計 gate の ADOPTED 化）

1. スーパーバイザが採用基準（例: 道路橋示方書・同解説 Ⅳ 下部構造編 / Ⅴ 耐震設計編 の特定条項）を指定
2. source_doc_id / locator / edition / applicability を登録
3. decision_id 発行（DS ガバナンス準拠）
4. 対応 check を HOLD → 実判定に切替え、M3 Gate を再実行
5. 全 Critical Gate PASS 時のみ PHASE_C1_MILESTONE3_COMPLETE: YES

## 6. 備考

- M2 までに構築した Model / Placement / Geometry / Viewer / UI は未変更のまま維持。
- 他プロジェクト由来の Apollo evidence JSON dirty 差分は本作業の所有物ではないため不変。
- 概算数量（幾何）・support-interface 接続・永続化・結果UI は ADOPTED として実装済み。
