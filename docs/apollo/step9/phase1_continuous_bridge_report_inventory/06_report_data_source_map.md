# 06 — ReportModel Data Source Map

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **対象:** `frontend/src/apollo/report/reportModel.ts` `buildReportModel` の 16 章それぞれが**どのデータソース**から値を得るかをコード証拠付きで対応さ�表。実装変更なし。
> **結論:** CH-DESIGN-COND だけが `bridgeSystem` を読む。解析結果章 (CH-REACTIONS/SHEAR/MOMENT/DEFLECTION) は**ハードコード NOT_AVAILABLE**（解析結果未バインド）。また**CH-SECTION も CONTINUOUS では NOT_AVAILABLE**（`spanLength===null` ガード落ち）。

## 0. 判定語

| 語 | 意味 |
|------|------|
| PRODUCIBLE | データソースから値を取り出せる（ただし NOT_AUTHORIZED / UNVERIFIED） |
| CONTINUOUS_BREAK | CONTINUOUS 時にデータソースが欠落 / NOT_AVAILABLE になる |
| HARD_NOT_AVAILABLE | コードが `null` をハードコード（解析結果未バインド） |
| NOT_A_REAL_STANDARD | 開発用 placeholder 文字列 |

## 1. 章レジストリ（`reportModel.ts:25-42`）

16 章（固定順）:

`CH-COVER` → `CH-DESIGN-COND` → `CH-STRUCTURE` → `CH-INPUTS` → `CH-SECTION` → `CH-LOADS` → `CH-ANALYSIS-SETTINGS` → `CH-REACTIONS` → `CH-SHEAR` → `CH-MOMENT` → `CH-DEFLECTION` → `CH-DEMAND` → `CH-QUANTITY` → `CH-DRAWING-REF` → `CH-WARNINGS` → `CH-AUDIT`

順序検証: `reportModel.ts:311-319` （`REPORT_CHAPTER_REGISTRY` と一致しないと throw）。

## 2. 章別データソース対応表

| 章ID | キー行 | データソース | SIMPLE | CONTINUOUS | ステータス |
|------|--------|--------------|--------|------------|------------|
| CH-COVER | `:163-168` | `project.project.{id,name}`, constants | ✅ | ✅ | PRODUCIBLE |
| CH-DESIGN-COND | `:175` | `draft.bridgeSystem` | ✅ `"SIMPLE_SINGLE"` | ✅ `"CONTINUOUS"` | **bridgeSystem 表示（唯一）** |
| CH-DESIGN-COND | `:176-177` | `"NOT_ADOPTED"` / `"NOT_GRANTED"` strings | — | — | NOT_A_REAL_STANDARD |
| CH-STRUCTURE | `:184-188` | `draft.bridgeLength/width/girderCount/girderSpacing/girderDepth` | ✅ | ⚠️ `bridgeLength`=Σspans, 他は draft フィールドあり | PRODUCIBLE (CONTINUOUS でも値ある) |
| CH-INPUTS | `:195-200` | `draft.topFlangeWidth/Thickness/bottomFlangeWidth/Thickness/webThickness/deckThickness/steelUnitWeight/rcUnitWeight` | ✅ | ✅ (draft フィールド存在) | PRODUCIBLE |
| CH-SECTION | `:206-216` | `computeGirderSectionProperties(...)` | ✅ | ❌ `spanLength===null` → section=null → `"断面入力不完全"` | **CONTINUOUS_BREAK** |
| CH-LOADS | `:222-223` | `"GOLD-AN-001/002"` string + `project.loadCases?.length` | ⚠️ placeholder | ⚠️ placeholder | NOT_A_REAL_STANDARD |
| CH-ANALYSIS-SETTINGS | `:230-232` | `"scipy_sparse"`, `"linear_static"`, `"NOT_GRANTED"` strings | ⚠️ dev probe | ⚠️ dev probe (SIMPLE idealization と無関係に固定) | NOT_A_REAL_STANDARD |
| CH-REACTIONS | `:238` | `null` (hardcode) | ❌ NOT_AVAILABLE | ❌ NOT_AVAILABLE | **HARD_NOT_AVAILABLE** |
| CH-SHEAR | `:243` | `null` | ❌ NOT_AVAILABLE | ❌ NOT_AVAILABLE | HARD_NOT_AVAILABLE |
| CH-MOMENT | `:248` | `null` | ❌ NOT_AVAILABLE | ❌ NOT_AVAILABLE | HARD_NOT_AVAILABLE |
| CH-DEFLECTION | `:253` | `null` | ❌ NOT_AVAILABLE | ❌ NOT_AVAILABLE | HARD_NOT_AVAILABLE |
| CH-DEMAND | `:259-261` | `"CANDIDATE..."`, `"GOLD-AN-001 × GOLD-SP-001"` strings | ⚠️ placeholder | ⚠️ placeholder | NOT_A_REAL_STANDARD |
| CH-QUANTITY | `:267-281` | `buildQuantityModel(project).items` (QTY-MG-VALL/DK-VOL/MG-W/DK-W/PAINT-GEOM/PV-VOL) | ✅ | ✅ (approx quantityModel works for continuous — `bridgeStructureQuantities.test.ts`) | PRODUCIBLE (dev) |
| CH-DRAWING-REF | `:287-289` | `"STANDARD_SECTION"`, `"DEVELOPMENT_PREVIEW_PENDING"` | ⚠️ dev | ⚠️ dev | NOT_A_REAL_STANDARD |
| CH-WARNINGS | `:295` | `warnings[]` | ✅ | ✅ | PRODUCIBLE |
| CH-AUDIT | `:301-306` | `inputRevision, inputChecksum, quantityChecksum, stale, appCommitSha` | ✅ | ✅ | PRODUCIBLE |

## 3. `computeGirderSectionProperties` のガード落ち（CONTINUOUS 特報）

```ts
// reportModel.ts:119-148
const section =
  draft.spanLength !== null &&     // ← CONTINUOUS は spanLength===null
  draft.bridgeLength !== null &&
  draft.width !== null &&
  draft.girderCount !== null &&
  draft.girderSpacing !== null &&
  draft.girderDepth !== null &&
  draft.topFlangeWidth !== null &&
  draft.topFlangeThickness !== null &&
  draft.bottomFlangeWidth !== null &&
  draft.bottomFlangeThickness !== null &&
  draft.webThickness !== null &&
  draft.deckThickness !== null &&
  draft.crossBeamSpacing !== null
    ? computeGirderSectionProperties({ spanLength: draft.spanLength, ... })   // ← spanLength 渡し
    : null;                                                                   // → CONTINUOUS はここ

// CH-SECTION rows:
rows: section
  ? [ ...7 rows of section props with status "UNVERIFIED" ]
  : [ row("sectionProperties", null, "", "NOT_AVAILABLE", "断面入力不完全") ],  // ← CONTINUOUS はこちら
```

> ■ **確認事項 DS-01:** `computeGirderSectionProperties` (`bridgeStructure/sectionProperties.ts`) は `spanLength` を引数に受けるが、**桁断面諸量（断面二次モーメント etc.）はスパン長に依らない**。しかしガードが `spanLength !== null` を要求するため、CONTINUOUS (`spanLength===null`) は CH-SECTION 全体が `NOT_AVAILABLE / 断面入力不完全` になる。→ **設計上のミス（section 計算を spanLength に誤結合）ではあるが、現実のデータソース欠落として記録**。

## 4. 解析結果データソース（analysis → ReportModel binding）

| 解析結果項目 | 現在のデータソース | ステータス |
|-------------|------------------|------------|
| 支点反力 | `null` (hardcode, `reportModel.ts:238`) | **NOT_BOUND** |
| せん断力 | `null` (`:243`) | NOT_BOUND |
| 曲げモーメント | `null` (`:248`) | NOT_BOUND |
| たわみ | `null` (`::253`) | NOT_BOUND |
| 解析メッシュ / 荷重ケース | `project.loadCases?.length` (count only; `reportModel.ts:223`) | COUNT_ONLY |

> ■ **確認事項 DS-02:** ReportModel は `project.apolloPhase1Unit2` / `project.analysisResults` / `apolloAnalysis` を**一切参照しない**。解析結果→報へのバインドは `scope_and_architecture_freeze.md` §5.5 の通り **NOT_IMPLEMENTED**。したがって CH-REACTIONS/SHEAR/MOMENT/DEFLECTION は**すべてのブリッジ System でハードコード NOT_AVAILABLE**となる。

### 4-1. バックエンド解析結果データソース（線形解析）

`backend/app/reports.py:96` `build_result_exports` → CSV+`result.json` (displacements/reactions/memberEndForces/eigen/influence/moving)。`test_reports_if3_gate.py` は `analysisType: linear_static` ハードコードで検証。

> ■ **確認事項 DS-03:** バックエンド解析結果は**線形解析 (linear_static)**向け IF3 リソースとしてエクスポートされ、**フロントエンド ReportModel へのパイプラインは存在しない**。フロントエンド `appurtenanceHaunchAnalysisAdapter.ts:385` は CONTINUOUS を「bridgeLength で単径間理想化」(`bridgeSystem !== SIMPLE_SINGLE`) として解析し、解析結果を ReportModel へ渡す経路はない。

## 5. データソースツリー

```
ProjectModel
├── project.apolloBridgeStructureInput  (ApolloBridgeStructureInputDraft)
│   ├─ bridgeSystem ──────────────→ CH-DESIGN-COND (:175)
│   ├─ bridgeLength/width/girderCount/
│   │   girderSpacing/girderDepth ─→ CH-STRUCTURE (:184-188)
│   ├─ topFlangeWidth/Thickness/… ──→ CH-INPUTS (:195-200)
│   ├─ spanLength ─────────────────→ CH-SECTION computeGirderSectionProperties guard (:119-120)
│   └─ supports/spans ─────────────→ BSDD bridge.spans/supports (別途, report には未直接反映)
├── apolloBsdd.structuralDesignModel  → 未直接参照 (CH-STRUCTURE は draft から)
├── apolloQuantityModel (buildQuantityModel) ─→ CH-QUANTITY (:267)
├── loadCases? ──────────────────→ CH-LOADS count (:223)
└── project.project.{id,name} ───→ CH-COVER (:163-164)

解析結果 (ProjectModel)
├── apolloPhase1Unit2 / analysisResults  → ❌ ReportModel 非参照
└── backend IF3 result resource ─────────→ ❌ ReportModel 非参照 (LINEAR のみエクスポート)
```

## 6. 結論 — データソース欠落箇所

| # | 欠落箇所 | 影響 | 根拠 |
|----|----------|------|------|
| DS-01 | CH-SECTION : `spanLength` ガード | CONTINUOUS で `sectionProperties=NOT_AVAILABLE` | `reportModel.ts:119-148,216` |
| DS-02 | CH-REACTIONS/SHEAR/MOMENT/DEFLECTION : `null` hardcode | すべて NOT_AVAILABLE (解析結果未バインド) | `reportModel.ts:238,243,248,253` |
| DS-03 | analysis → ReportModel binding | 解析結果報へ未反映 | `scope_and_architecture_freeze.md` §5.5; `appurtenanceHaunchAnalysisAdapter.ts:385` |
| DS-04 | CH-ANALYSIS-SETTINGS : dev probe strings | `linear_static`/`scipy_sparse` は CONTINUOUS 解析ではない | `reportModel.ts:230-232` |
| DS-05 | CH-LOADS : `GOLD-AN-001/002` placeholder | 実際の荷重ケース未表示 | `reportModel.ts:222-223` |

### 補記
- 現 HEAD: `34fcf9e`（local==origin/main，clean）。
- 次フェーズ: Phase 1-H (`07_numeric_authorization_boundary.md`) → 08(gap) → 09 → evidence_matrix.csv → completion_report。
