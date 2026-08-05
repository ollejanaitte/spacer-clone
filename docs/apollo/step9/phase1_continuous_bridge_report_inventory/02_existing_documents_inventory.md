# 02 — Existing Documentation Inventory

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **ステータス:** CONFIRMED（文書はコードを開く前にすべて読み込み済み）

本ファイルは、連続橋設計計算書整備に関係する既存文書を列挙し、各文書の役割・正本性・記載内容・制限を整理したものである。
既存資料に誤記・矛盾を見つけた場合は、Phase 1 では既存資料を直接修正せず、「確認事項」として記録する。

## 0. 判定語の定義

- CONFIRMED — コード・テスト・資料で確認済み
- PARTIALLY_CONFIRMED — 一部確認されているが不完全
- NOT_FOUND — 資料・コード・テストで確認できず
- NOT_APPLICABLE — 対象外
- CONFLICTING_EVIDENCE — 資料間に矛盾
- HUMAN_CONFIRMATION_REQUIRED — 人間の判断が必要

## 1. 連続橋正本資料群（`docs/apollo/continuous_girder/`）

### 1.1 README.md
- **パス:** `docs/apollo/continuous_girder/README.md`
- **Authority:** Step C0（scope freeze）
- **目的:** 2〜5径間連続桁の垂直スライス（入力→SDM→3D→save/reload→STL）スコープを凍結。
- **正本性:** 正本
- **連続橋との関係:** 中心資料。`spanSystem=CONTINUOUS`, 2〜5径間, 等桁高・同一断面, 直橋（曲線・斜・変桁高 OUT）。
- **計算書との関係:** 計算書は **OUT_OF_SCOPE**。幾何・3D・STLのみ。
- **数値設計との関係:** 数値・断面力・照査・活荷重包絡は **OUT_OF_SCOPE**。
- **現在の制限:** `phase1ScopeGuard` の CONTINUOUS は C1 まで OUT_OF_SCOPE のまま維持（§7）。
- **後続Phase使用:** Phase 2 の計算書章構成の前提。
- **不明点:** なし
- **証拠:** §4 数値ゲート `NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED` / `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`

### 1.2 scope_freeze.md
- **パス:** `docs/apollo/continuous_girder/scope_freeze.md`
- **Authority:** Step C0
- **目的:** スコープ・前提・フェーズ境界を凍結。
- **IN_SCOPE:** 直橋, 非合成RC床版鋼鈑桁, 等桁高・同一断面, 2〜5径間連続, 支承・橋台・橋脚簡易モデル, STALEゲート, save/reload, STL。
- **OUT_OF_SCOPE:** 複数独立単紘間, 正式解析, 負曲げ, 活荷重, 変桁高/曲線/斜, 合成桁, 道示未確認値, 設計OK/NG, 利用率。
- **確認事項:** §1.1 IN_SCOPE に「橋台（端部）・橋脚（中間）の簡易モデル（箱形ブロックまたは円柱近似）」があるが、実装が存在するかは 03 実装棚卸しで確認（Phase 1-D）。

### 1.3 data_model_spec.md
- **パス:** `docs/apollo/continuous_girder/data_model_spec.md`
- **Authority:** Step C0（設計文書。実装は C1）
- **目的:** 入力ドラフト・SDM・BSDDの連続桁表現を定義。
- **追加フィールド:** `bridgeSystem: "SIMPLE_SINGLE"|"CONTINUOUS"`, `spanCount`(2〜5) — C1 実装予定。
- **SDM:** `spans[i].continuity="continuous"`（C1追加）, supports=`spanCount+1`, 端=`abutment`, 中間=`pier`, `station=i×spanLength`
- **BSDD:** `phase1ScopeAssertion.spanSystem="continuous"` additive（schema version要検討）
- **確認事項:** §2.2 `spans[i].continuity` と §3 `fixity` は C1 実装予定であるため、現時点（Phase 1）では `NOT_IMPLEMENTED`。実装確認は 03。

### 1.4 ui_spec.md
- **パス:** `docs/apollo/continuous_girder/ui_spec.md`
- **Authority:** Step C0（実装は C2）
- **目的:** 入力UI定義。
- **構造形式選択:** C2 実装予定。`SIMPLE_SINGLE`/`CONTINUOUS`切替。
- **確認事項:** C2実装前のため、UI未実装（`NOT_IMPLEMENTED`）

### 1.5 visualization_spec.md
- **パス:** `docs/apollo/continuous_girder/visualization_spec.md`
- **Authority:** Step C0（実装は C3）
- **目的:** 3Dソリッド・STL出力仕様。
- **確認事項:** C3実装前。`manual_verification_checklist.md` §10 によると自動テストはPASS済みだが（MV-01..12等）、これは C4 検証結果。Phase 1では実装状況は 03 実装棚卸しで再確認。

### 1.6 analysis_boundary.md
- **パス:** `docs/apollo/continuous_girder/analysis_boundary.md`
- **Authority:** Step C0
- **目的:** 解析・照査の禁止境界。
- **禁止:** 静的解析, 正式照査, 負曲げ, 活荷重, 合成作用, 非線形, 下部工設計
- **designStatus:** 全エンティティ `NOT_AUTHORIZED`

### 1.7 manual_verification_checklist.md
- **パス:** `docs/apollo/continuous_girder/manual_verification_checklist.md`
- **Authority:** Step C0 / C4
- **目的:** 手動GUI確認チェックリスト（MV-CG-01..35, MV-01..12, MV-BR-01..16）
- **現状:** `MANUAL_GUI_VERDICT: PASS`（PR #283）; MV-BR-09..16, MV-CG-01..35 は PENDING 残存
- **検証メモ:** `npm test -- src/apollo` PASS（40 files/300 tests at 2026-08-02）
- **確認事項:** このチェックリストは C4 検証結果を記録している。Phase 1 は現状調査であり、この通り実行済みとする。

### 1.8 completion_report.md
- **パス:** `docs/apollo/continuous_girder/completion_report.md`
- **Authority:** Step C4
- **目的:** C4完了報告（検証・回帰）。`bridgeSystem`/`spanCount`は未実装（C1）であるため、この完了報告の「検証」は幾何・3D・STLのみ。
- **確認事項:** §3 修正内容に `simpleSingleSpanWorkflow.test.ts` 新規が記載されているが、これは simple_single_spanの S2。本ファイルの検証対象が continuous_girder C4 と命名されている点に不整合？ → **CONFLICTING_EVIDENCE**: タイトルは「連続桁垂直スライス Step C4完了」だが検証内容は単径間ワークフロー。要人間確認。

> ■ **確認事項 CG-DOC-01:** `continuous_girder/completion_report.md` のタイトルは「連続桁垉直スライス Step C4完了」とするが、検証対象が `simple_single_span` の `simpleSingleSpanWorkflow.test.ts` となっている。連続桁 C4 完了報告か単径間 S2 報告か、判定に混乱。HUMAN_CONFIRMATION_REQUIRED。

## 2. 計算書・出力仕様群

### 2.1 `docs/apollo/phase_a_integrated_freeze/09_report_output_spec.md`
- **パス:** `docs/apollo/phase_a_integrated_freeze/09_report_output_spec.md`
- **Authority:** Phase A A7（計算書出力仕様 凍結）
- **目的:** ReportModel の章構成・出力可否・構造を定義する **正式な計算書出力仕様**。
- **ReportModel 章構成:** 設計条件, 構造概要, 材料, 荷重, 解析条件・結果, RC床版, 主桁, 床組, 補剛材, 添接, たわみ・剛比, 疲労, 鋼重, 図面, 監査記録
- **出力可否規則:** 08_numeric_authorization_gate で GRANTED となった部材・照査のみ数値出力。未採択は「未許可」明示。
- **出力形態:** HTML + PDF + calculation CSV/JSON + audit
- **関係:** これは **linear / single-span（S0-S2）** 向けの Phase A 成果。連続桁への適用は未定義（Phase 1-D/06で確認）。

> ■ **確認事項 OUT-01:** `09_report_output_spec.md` は linear 向け ReportModel を定義しているが、`continuous_girder/` 配下には対応する計算書出力仕様がない。連続橋計算書の章構成は Phase 2 で凍結予定。

### 2.2 `docs/apollo/phase1_design_expansion_refreeze/scope_and_architecture_freeze.md`
- **パス:** `docs/apollo/phase1_design_expansion_refreeze/scope_and_architecture_freeze.md`
- **Authority:** Phase 1 再凍結（FROZEN_FOR_REVIEW）
- **目的:** 設計・解析・図面・計算書のアーキテクチャ境界を定義。§9 に ReportModel 章構成を記載。
- **ReportModel (§9):** 設計条件, 構造概要, 材料, 荷重, 解析条件・結果, RC床版, 主桁, 床組, 補剛材, 添接, たわみ・剛比, 疲労, 鋼重, 図面, 監査記録（== 2.1 と一致）
- **§2.2 OUT_OF_SCOPE:** `複数径間連続桁` 明記
- **確認事項:** §2.2 に「複数径間連続桁」がOUT_OF_SCOPEに記載されているが、`continuous_girder/` スコープは2〜5径間連続桁をINにする。→ **CONFLICTING_EVIDENCE**: phase1_design_expansion_refreeze §2.2 と continuous_girder README §2 の IN/OUT が逆。ただし前者は「Phase 1 対象外」（実装前）、後者は「垂直スライス対象」（C0凍結）。文脈の違いによる。HUMAN_CONFIRMATION_REQUIRED。

> ■ **確認事項 ARCH-01:** `phase1_design_expansion_refreeze` §2.2 は「複数径間連続桁」を Phase 1 OUT_OF_SCOPE とするが、`continuous_girder/README.md` §2 は 2〜5径間を IN_SCOPE とする。文脈（実装フェーズ vs 垂直スライス）の違いによる可能性。要確認。

### 2.3 `docs/apollo/step2_report/generate_report_pdf.mjs`
- **パス:** `docs/apollo/step2_report/generate_report_pdf.mjs`
- **Authority:** Step 2 開発ツール
- **目的:** ReportModel HTML → Playwright Chromium → A4 PDF 生成スクリプト。
- **ステータス:** `UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION`
- **出力:** PDF binary not committed to git; `/tmp/apollo-development-report_*.pdf`
- **関係:** 現在の PDF 出力メカニズム。対象は ReportModel HTML。
- **確認事項:** このスクリプトが対象にする ReportModel HTML の生成元は Phase 1-D/06 で確認要。

### 2.4 `docs/apollo/step2_report/step2b_development_gate.md`
- **パス:** `docs/apollo/step2_report/step2b_development_gate.md`
- **Authority:** Step 2-B
- **purpose:** ReportModel HTML/PDF/CSV/JSON の開発ゲート判定。
- **判定:** `PDF_EXPORT_VERDICT: PASS`, `HTML_PREVIEW_VERDICT: PASS`, `REPORT_JSON_VERDICT: PASS` — **開発のみ**（`PASS_DEVELOPMENT_ONLY`）。`NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`。

### 2.5 `docs/apollo/step2_output_integration/README.md`
- **パス:** `docs/apollo/step2_output_integration/README.md`
- **Authority:** Step 2
- **purpose:** 開発用 Apollo Step 2 出力（quantity/report/drawing）の対応範囲。
- **Supported:** QuantityModel CSV/JSON, ReportModel HTML/PDF path + calculation CSV/JSON + audit, standard section SVG/DXF/A3-HTML, STALE export guards, GUI panels.
- **Unsupported:** Formal report/drawing authorization, Zip bundle, Plan/elevation drawings, Formal quantity takeoff.
- **判定:** `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`, `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED`

### 2.6 `docs/road/output/report_output_spec.md`
- **パス:** `docs/road/output/report_output_spec.md`
- **Authority:** ACTIVE REFERENCE（Road/ライン設計）
- **purpose:** Road liner design report（HTML/CSV）仕様。
- **chapter:** projectInfo, alignmentSegments, stationCoordinates, profileElevations, gridPoints, ldistResults, haunchResults, hosoResults, diagnostics
- **関係:** **Road liner 系**のレポート。橋梁構造設計計算書とは **別系**。橋梁計算書には直接適用不可。
- **確認事項:** このファイルが定義する「計算書」は道路線形レポートであり、橋梁設計計算書ではない。混同禁止。

### 2.7 `docs/frame/output/10_report_spec.md`
- **パス:** `docs/frame/output/10_report_spec.md`
- **Authority:** リダイレクト先（legacy Frame）
- **purpose:** `docs/08_ui_spec.md` 等のスタブが指す legacy Frame レポート仕様。
- **関係:** historical legacy。現行 Apollo 計算書の正本は `phase_a_integrated_freeze/09_report_output_spec.md`。

### 2.8 `docs/design/report-drawing-output.md`
- **パス:** `docs/design/report-drawing-output.md`
- **Authority:** REDIRECT STUB
- **purpose:** リダイレクト。正本は `docs/frame/output/report-drawing-output.md`。
- **関係:** legacy。Phase 1対象外（スタブ）。

## 3. 設計基準・ゲート群

### 3.1 `docs/apollo/design-standards/README.md`
- **Authority:** CURRENT INTEGRATION AUTHORITY (design standards)
- **purpose:** DS-00..DS-09 のガバナンス・凍結状態。数値ゲート `NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED`。

### 3.2 `docs/apollo/design-standards/09_verification/numeric_release_gate.md`
- **Authority:** DS-09（canonical gate）
- **purpose:** 数値実装リリースの連言規則 GATE-NR-01..07。
- **現状:** GATE-NR-01..05 BLOCKED, 06/07 PASS。全体 BLOCKED。
- **許可作業:** 証拠取得・独立誘導・fail-closed comparison tooling。
- **禁止作業:** production 数値採用・Analyzer機械証跡の捏造・Golden自己承認等。

### 3.3 `docs/apollo/evidence-collection/numeric_release_gate.md`
- **Authority:** EA-06
- **purpose:** 機械エビデンス・Golden・parityの enablement 再評価（ツール完備だがブロッカー未解決）。
- **判定:** `NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED`

### 3.4 `docs/apollo/phase_a_integrated_freeze/08_numeric_authorization_gate.md`
- **Authority:** Phase A A7
- **purpose:** 部材×照査単位の許可テーブル。**現状全セル `NOT_AUTHORIZED`**。
- **構成:** main_girder/bending, rc_deck, cross_girder, sway_bracing, lateral_bracing, stiffener, splice, bearing × 曲げ/せん断/軸力・安定/たわみ/疲労/連結・支承

## 4. 実装ガバナンス群

### 4.1 `docs/apollo/ap00/final/ap00_final_report.md`
- **Authority:** AP-00 (P04)
- **purpose:** 実装ガバナンス。feature flag `VITE_APOLLO_PHASE1_ENABLED` (default OFF), `phase1ScopeGuard.ts`, `numericAuthorityGuard.ts`, fail-closed guards。
- **Supervisor:** Grok 4.5, **Worker:** Composer 2.5
- **判定:** `AP00_COMPLETION_VERDICT: COMPLETE`, `AP01_READINESS_VERDICT: GO_WITH_NON_NUMERIC_RESTRICTIONS`
- **関係:** phase1ScopeGuard により CONTINUOUS は OUT_OF_SCOPE まま維持（本ファイル §10 参照: `phase1ScopeGuard の CONTINUOUS は C1 完了まで OUT_OF_SCOPEのまま維持`）

> ■ **確認事項 GOV-01:** ap00_final_report は「Worker: Composer 2.5」と記すが、本作業は opencode が直接実施。役割継承の文脈であり実装上の支配ではない。

### 4.2 `docs/apollo/ap01/final/ap01_final_report.md`
- **Authority:** AP-01
- **purpose:** `BridgeSuperstructureDesignDocument` を非数値 contract として昇格（schemaVersion 0.1.0）。GovernedQuantity placeholder/pending/unknown paths。
- **実装場所:** `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`, `governedQuantity.ts`, Zod schema, `schemas/contracts/v0.1/...`
- **判定:** 数値採用は Rejected。BSDD contract は phase1ScopeGuard でゲート。

### 4.3 `docs/apollo/ap11/final/ap11_final_report.md`
- **Authority:** AP-11
- **purpose:** IF3 クライアントバインド修正（LIM-P03-001）。`POST /api/analysis/run` へ if3 metadata。Legacy PDF bypass deny。
- **実装場所:** `frontend/src/if3/projectModelSourceBinding.ts`, `buildRunAnalysisIf3Metadata.ts`, `runAnalysisBindingGuard.ts`, `legacyPdfBypassGuard.ts`

> ■ **確認事項 GOV-02:** ap11 §1.4 `Legacy openResultPdfReport raw-PDF entry is blocked` によると、旧PDF直接開出口はブロック済み。Phase 1-F で実装確認要。

## 5. 線形（SIMPLE_SINGLE）基準資料群

### 5.1 `docs/apollo/simple_single_span/README.md`
- **Authority:** Step S0
- **purpose:** 単径間単紘簡桁の整理。`spanCount=1`, `bridgeLength==spanLength`, NOT_AUTHORIZED。

### 5.2 `docs/apollo/simple_single_span/field_semantics.md`
- **Authority:** Step S0
- **purpose:** 入力フィールド意味定義。**現行実装の実測に基づく**。
- **内部型:** `frontend/src/apollo/bridgeStructure/types.ts` `ApolloBridgeStructureInputDraft`
- **フィールド定義場所:** `BRIDGE_STRUCTURE_INPUT_FIELDS`（types.ts:67-85）
- **導出規則:** `validation.ts:23-30` `resolveSpanCount = round(bridgeLength/spanLength)` (不可整 nulls)
- **BSDD生成:** `generateBsdd.ts:110,315,343`
- **単位重量:** `sectionProperties.ts:107`
- **表示名改定:** spanLength→支間長, bridgeLength→構造モデル長 (Step S1)

### 5.3 `docs/apollo/simple_single_span/sample_input_spec.md`
- **Authority:** Step S0
- **purpose:** サンプル入力仕様（設計採用値ではない）。

### 5.4 `docs/apollo/simple_single_span/manual_verification_checklist.md`
- **Authority:** Step S2
- **purpose:** 単径間ワークフロー手動確認チェックリスト。

## 6. 3D・STL関連

### 6.1 `docs/apollo/3d-stl/14_axis_camera_main_viewer_bug_report.md`
- **Authority:** bug report (2026-07-30 origin/main)
- **purpose:** Apollo 3D viewer 軸/campreset/fit/main-viewer バグ記録。
- **pipeline:** `ApolloPhase1Shell -> buildApolloVisualizationModel -> Viewer3D -> ThreeViewport -> SceneBuilder -> ApolloVisualizationRenderer`
- **関係:** 3D可視化の表示品質。計算書出力とは非直接関係。

## 7. その他関連ドキュメント

### 7.1 `docs/apollo/README.md`
- **Authority:** HISTORICAL / RESEARCH INPUT
- **purpose:** Apollo docs ナビゲーション。Step 1, AP-00, DS-00..09, EA, 研究, Step 2〜6 等の索引。

### 7.2 `docs/apollo/phase1_orchestration/*`
- **Authority:** Phase 1 オーケストレーション
- **purpose:** Phase 1 各unitの検証Orchestration。`final_phase1_orchestration_report.md`。

### 7.3 `docs/05_analysis_engine_spec.md` 等 (docs/05〜12)
- **Authority:** REDIRECT STUB / DEPRECATED
- **purpose:** legacy Frame 仕様へリダイレクト。`docs/frame/*` が正本。

### 7.4 `docs/apollo/visible_vertical_slice_01/02/ local_implementation_report.md`
- **Authority:** 実装報告
- **purpose:** Apollo 3D Visible Vertical Slice の実装報告。3D可視化の実装状況。

## 8. 矛盾・確認事項一覧

| ID | 内容 | 分類 |
|----|------|------|
| CG-DOC-01 | continuous_girder/completion_report.md タイトルと検証対象の不整合 | CONFLICTING_EVIDENCE → HUMAN_CONFIRMATION_REQUIRED |
| OUT-01 | 計算書出力仕様 09_report_output_spec.md が linear 向け。連続橋版未存在 | CONFIRMED |
| ARCH-01 | phase1_design_expansion_refreeze §2.2 「複数径間連続桁 OUT」 vs continuous_girder IN | HUMAN_CONFIRMATION_REQUIRED |
| GOV-01 | ap01/ap11 final report の Supervisor/Worker記載 vs 本作業 | NOT_APPLICABLE（運用上の記述） |
| GOV-02 | ap11 legacy PDF bypass block | CONFIRMED（実装確認は 03/06） |

## 9. 資料の正本性まとめ

| カテゴリ | 正本 |
|----------|------|
| 連続橋スコープ | `docs/apollo/continuous_girder/*.md` (C0/C4) |
| 計算書出力仕様 | `docs/apollo/phase_a_integrated_freeze/09_report_output_spec.md` |
| 数値許可ゲート | `docs/apollo/design-standards/09_verification/numeric_release_gate.md` (DS-09) + `phase_a_integrated_freeze/08_numeric_authorization_gate.md` |
| ReportModel章構成 | `phase1_design_expansion_refreeze/scope_and_architecture_freeze.md` §9 == `phase_a_integrated_freeze/09_report_output_spec.md` |
| PDF生成 | `docs/apollo/step2_report/generate_report_pdf.mjs` (dev-only) |
| 実装ガバナンス | `docs/apollo/ap00/final/ap00_final_report.md` |

> **結論（Phase 1-C):** 連続橋設計計算書を整備するための **正式資料は未存在**。最も近い正本は (a) `continuous_girder/`（幾何・3D・STLのみ、計算書OUT）、(b) `phase_a_integrated_freeze/09_report_output_spec.md`（linear向け ReportModel）。数値ゲートは全域 `NOT_AUTHORIZED`/`BLOCKED`。
