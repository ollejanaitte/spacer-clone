# 08 — Gap Analysis

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **対象:** 01〜07 で発見したギャップを網羅的に整理し、**対応先のSTEP 9フェーズ**を対応付ける。実装変更なし。
> **結論:** 幾何/BSDD/3D/STL/保存の**形状層**は実装＋テスト済みだが、**解析結果→設計計算書の桁ごと整備**はすべて未実装であり、ゲートも `NOT_AUTHORIZED`/`BLOCKED`。命名衝突（phase1ScopeGuard vs BridgeSystem）は設計意図の誤一致疑惑。

## 0. 判定語

| 語 | 意味 | Phase 1 での取扱い |
|------|------|------------------|
| CONFIRMED_GAP | 実装／テスト／出力として欠落確認済み | Phase 1 記録のみ |
| CONFLICTING_EVIDENCE | ドキュメント間／ドキュメントと実装の不一致 | HUMAN_CONFIRMATION_REQUIRED |
| OUT_OF_SCOPE | Phase 1 対象外（STEP 9 Phase 6+） | 記録のみ |

## 1. ギャップ分類

| No. | カテゴリ | ギャップ | ステータス | コード根拠 | STEP 9 対応フェーズ |
|-----|----------|--------|------------|------------|-------------------|
| G-01 | 実装 | ReportModel は `BridgeSystem.CONTINUOUS` の解析結果章を一切出力しない | CONFIRMED_GAP | `reportModel.ts:235-253` (CH-REACTIONS/SHEAR/MOMENT/DEFLECTION = `null`→NOT_AVAILABLE) + `§3 DS-02` | Phase 6 (ReportModel binding) |
| G-02 | 実装 | CH-SECTION が `spanLength===null` ガードで CONTINUOUS に NOT_AVAILABLE | CONFIRMED_GAP | `reportModel.ts:119-148,206-216` (§3 DS-01) | Phase 6 (section calc refactor) |
| G-03 | 実装 | 連続橋解析（pier 反力/固定ピンク曲げモーメント分布）未実装 — single-span idealization のみ | CONFIRMED_GAP | `appurtenanceHaunchAnalysisAdapter.ts:385` | Phase 5 (Analysis) |
| G-04 | 実装 | ReportModel に `analysisResult` → chapter バインド経路未実装 | CONFIRMED_GAP | `scope_and_architecture_freeze.md` §5.5 (NOT_IMPLEMENTED) | Phase 6 |
| G-05 | 実装 | formal PDF 生成拒否（`assertFormalReportRejected`） | CONFIRMED_GAP | `reportExport.ts:66` | Phase 6 (AP-03 PDF engine) |
| G-06 | 出力 | 図面束 manifest `unsupportedScope` に「continuous design drawings」明記 | CONFIRMED_GAP | `artifactBundle.ts:235-239` (§1.5 OUT-02) | Phase 6 (CAD/schedule template) |
| G-07 | テスト | ReportModel / outputIntegration / formal quantityModel は SIMPLE_SINGLE テストのみ | CONFIRMED_GAP | `reportModel.test.ts:20`(SIMPLE), `outputIntegration.test.ts:15`(SIMPLE), `quantityModel.test.ts:26/46`(SIMPLE) (§1.4 GAP-01〜03) | Phase 6 (test parity) |
| G-08 | テスト | `appurtenanceHaunchAnalysisAdapter.ts:385` continuous idealization 分岐未テスト | CONFIRMED_GAP | (no test file references the adapter) (§1.4 GAP-04) | Phase 5 |
| G-09 | 許諾 | 部材・照査すべて NOT_AUTHORIZED; DS-09 GATE-NR-01..05 BLOCKED | CONFIRMED_GAP (by design) | `08_numeric_authorization_gate.md` §2, §3 (§4 境界テーブル) | Phase 6+ (DEC-PHA-xxxx) |
| G-10 | 許諾 | unitWeight ADOPTED ランタイム fail-closed（NOT_SELECTED） | CONFIRMED_GAP (intended) | `adoption.ts:87-126` + `BridgeStructureInputPanel.tsx:256` (§5 NA-01) | Phase 6 (standard selection UI) |
| G-11 | データ | 保存/再読込マイグレーション（1.0.0→1.5.0）実装済だが AP-02 は Rejected 宣言 | CONFLICTING_EVIDENCE | `generateBsdd.ts:548` `parseBridgeStructureInputDraft` (§1.3 03 IMPL-01) 対 `ap01_final_report.md` §4 "AP-02 Rejected" | HUMAN_CONFIRMATION_REQUIRED (AP-01/AP-02) |
| G-12 | 命名 | `phase1ScopeGuard.ts` は `Phase1SpanSystem.CONTINUOUS` (legacy AP-00) をゲート。実装機能 `BridgeSystem.CONTINUOUS` は別系統で `layoutValidation.ts` がゲート | CONFLICTING_EVIDENCE | `phase1ScopeGuard.ts:60,89` (AP00_SCOPE_CONTINUOUS) 対 `layoutValidation.ts:234-251` (§1-03 03) | HUMAN_CONFIRMATION_REQUIRED |

## 2. ギャップ詳記

### G-01 / G-04: ReportModel に解析結果未バインド
- `buildReportModel` (`reportModel.ts:109`) は `project.apolloPhase1Unit2`/`analysisResults` を参照しない。
- CH-REACTIONS `:238` = `row("reactions", null, "kN", "NOT_AVAILABLE", ...)`。せん断/曲げ/たわみも同値。
- `reportModelToCalculationCsv` (`:354-372`) は `NOT_AVAILABLE` プレースホルダー1行だけ出力（zero-fill しない）。
- → いかなる解析結果も ReportModel へ到達しない。**正式計算書の土台データすらない。**

### G-02: CH-SECTION の spanLength ガード
- `computeGirderSectionProperties` は `spanLength` を引数にするが**桁断面諸量はスパン長非依存**。しかし `reportModel.ts:119-120` の `draft.spanLength !== null && …` ガードにより、CONTINUOUS(`spanLength===null`)は `section=null` → `row("sectionProperties", null, "", "NOT_AVAILABLE", "断面入力不完全")`。
- → **CONTINUOUS は ReportModel で主桁断面諸量も NOT_AVAILABLE**。SIMPLE_SINGLE(テスト)では UNVERIFIED で出る。

### G-03: 連続橋解析 idealization
- `appurtenanceHaunchAnalysisAdapter.ts:385`: `if (draft.bridgeSystem !== "SIMPLE_SINGLE")` → dev 仮定ノート「continuous を bridgeLength で単径間理想化」。
- → pier 反力/固定ピンクモーメント分布等の**真の連続桁解析未実装**。`backend/engine/bridge_fem_generator.py` は FEM メッシュ生成（`test_bridge_fem_generator.py`）であり、解析結果→報パイプラインはない。

### G-06: drawing 束の unsupportedScope
- `artifactBundle.ts:235-239`: `unsupportedScope: ["curve/skew/continuous design drawings", "fabrication drawings", "formal authorization"]`。
- `00_README.txt` `:175`: known limitations `"Straight simple-span equal-depth non-composite RC-desk steel plate girder"` (simple-span 前提ハードコード)。
- → bundle は CONTINUOUS でも生成できるが**manifest は continuous を明示的未対応**。

### G-07 / G-08: テスト不足
- `reportModel.test.ts`: `generatedProject()` = `fillSimpleSingleBridgeStructureInput` (line 20)。CONTINUOUS 入力での章順/チェックサム/NOT_AVAILABLE は未検証。
- `outputIntegration.test.ts`: `generated()` = SIMPLE_SINGLE (line 15)。CONTINUOUS での checksum alignment / bundle=READY 未検証。
- `quantityModel.test.ts`: GOLD-QTY-001/002 いずれも SIMPLE_SINGLE。CONTINUOUS での formal quantityModel + `QTY-SUM-SPAN` (report chapter) 未検証。
- `appurtenanceHaunchAnalysisAdapter.ts`：テストで reference されていない（grep 確認）。

### G-10 / G-12: 許諾・命名
- unitWeight ADOPTED は `withAdoptedBridgeStructureUnitWeight(ctx=NOT_SELECTED)` が fail-closed。SELECTED コンテキストは `numericFixtures.ts` テスト専用。
- `phase1ScopeGuard`（AP00）と `BridgeSystem`（実装）は**同じ「continuous」を指すのに異なる型・ゲート対象**。03 IMPL-01/02。

## 3. ギャップ → STEP 9 フェーズ対応図

```
現行実装: 入力→BSDD→3D→STL→[dev bundle(HTML/CSV/SVG)]  ──(解析結果未バインド)──> ReportModel(NOT_AVAILABLE)
                                                                                   ↑ 枢軸ギャップ G-01/G-04
                                                                                   │
STEP 9 フェーズ:  Phase 5(解析継続) → Phase 6(計算書) → Phase 6+(gate/DEC-PHA)
                 (G-03,G-08)        (G-01,G-02,G-04,G-05,G-06)     (G-09,G-10)
                 (G-12 命名 reconcile は AP-01/AP-02 調整)
```

| フェーズ | ギャップ対応 | 本 Phase 1 での取扱い |
|----------|--------------|----------------------|
| STEP 9 Phase 5 (Analysis) | G-03 (連続解析), G-08 (理想化テスト) | 調査記録のみ |
| STEP 9 Phase 6 (Report/PDF) | G-01, G-02, G-04, G-05, G-06, G-07 | 調査記録のみ |
| STEP 9 Phase 6+ (Gate) | G-09 (DS-09), G-10 (ADOPTED) | 調査記録のみ |
| AP-01/AP-02 (architecture) | G-11 (persisted migration), G-12 (命名 reconcile) | **HUMAN_CONFIRMATION_REQUIRED→停止報告** |

## 4. HUMAN_CONFIRMATION_REQUIRED 事項 (停止報告対象)

| # | 事項 | 判定根拠 |
|------|------|----------|
| H-01 | `phase1ScopeGuard.ts` (AP00 `Phase1SpanSystem.CONTINUOUS` → `AP00_SCOPE_CONTINUOUS`/OUT_OF_SCOPE) は**実装機能 `BridgeSystem.CONTINUOUS` とは別**。2者の「continuous」は同一概念か。 | `phase1ScopeGuard.test.ts:67-71` vs `layoutValidation.ts:234`; 03 §IMPL-01 |
| H-02 | `generateBsdd.ts` の 1.0.0→1.5.0 migration は実装済だが `ap01_final_report.md` §4 は「AP-02 Document lifecycle persistence/migration Rejected」とする。AP-02 の拒否は**migration 実装**を含むか。 | 03 §1.3 |
| H-03 | `artifactBundle.ts:235` `unsupportedScope` が「continuous design drawings」を列挙するが、Bundle は実質生成できる（generic）。continuous を **supported に進める**か **明示的除外**として位置づけるか。 | §1.5 OUT-02 |

> ■ **Phase 1  stance:** いずれも**実装変更せず記録のみ**。H-01〜H-03 は STEP 9 Phase 6+ / AP-01〜02 の決定事項。

## 5. 結論 — 実装可能vs不能判定

| 領域 | 現状 | Phase 1 で変更可否 |
|------|------|-------------------|
| 入力/BSDD/3D/STL/save-reload (幾何) | IMPLEMENTED | 変更なし |
| ReportModel（dev HTML/CSV/JSON) | IMPLEMENTED (generic, SIMPLE_SINGLE) | 変更なし |
| ReportModel 解析章 (reactions/shear/moment/deflection) | NOT_AVAILABLE | — |
| formal PDF | Rejected | — |
| 数量 (formal quantityModel) | SIMPLE_SINGLE only | — |
| 数値許諾 (DS-09) | 全セル NOT_AUTHORIZED / BLOCKED | — |

→ **「幾何だけ実装済み、計算書としての本体（解析結果+正式PDF）は未実装」** という確定見通し。正式計算書への実装は **STEP 9 Phase 6 以降**（解析結果バインド G-01/G-04, section G-02, PDF G-05, drawing G-06, テスト G-07/G-08, gate G-09/G-10）で行う。

### 補記
- 現 HEAD: `c57a68a`（local==origin/main，clean）。
- 次フェーズ: Phase 1-J (`09_phase2_recommendation.md`) → `evidence_matrix.csv` → `completion_report.md`。
