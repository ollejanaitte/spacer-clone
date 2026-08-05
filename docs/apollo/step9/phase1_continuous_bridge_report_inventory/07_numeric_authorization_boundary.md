# 07 — Numeric Authorization Boundary

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **対象:** 数値・解析・許諾ステータスの**現在の承認境界**をコード証拠付きで整理。実装変更なし。
> **結論:** フロントエンド実装中の連続橋でも**すべての設計数値・解析結果は `NOT_AUTHORIZED` / `NOT_GRANTED` / `PROHIBITED`**。唯一の numerically-adoptable 値（単位体積重量）は**デフォルト NOT_SELECTED コンテキストで fail-closed**（実装許可は未来の標準選定後）。

## 0. 判定語

| 語 | 意味 |
|------|------|
| BOUNDARY | 承認境界（現状の gate） |
| ENFORCEMENT_POINT | 実装許可を問い合わせる本番呼出し地点 |

## 1. 数値許諾語彙（`src/apollo/types.ts`）

| enum | 値 | 備考 |
|------|----|------|
| `TargetStandardStatus` (`types.ts:3-9`) | `NOT_SELECTED` / `SELECTED` / `FROZEN` | デフォルトは `NOT_SELECTED` |
| `NumericAuthority` (`types.ts:11-17`) | `PLACEHOLDER` / `USER_PROVIDED_UNVERIFIED` / `SOURCE_TRACED` / `ADOPTED` | `isTreatableAsAdopted` ⇔ `ADOPTED` のみ (`numericAuthorityGuard.ts:20-22`) |
| `ImplementationAuthorization` (`types.ts:19-25`) | `NOT_AUTHORIZED` / `CONDITIONAL` / `AUTHORIZED` | DS-09 §2 許可セル状態 |
| `adoptionStatus` (BSDD unitWeight) | `UNKNOWN` / `PENDING` / `ADOPTED` | `adoption.ts` で管理 |

> ■ **確認事項:** `TargetStandardStatus.NOT_SELECTED` は `withAdoptedBridgeStructureUnitWeight` の**デフォルトコンテキスト** (`adoption.ts:17-19`)。ADOPTED は `NOT_SELECTED` 下では**fail-closed**（`numericAuthorityGuard.validateNumericAuthority` → `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD`）。

## 2. ガード規則・コード (`numericAuthorityGuard.ts`)

| 規則関数 | トリガー | コード | fail-closed |
|----------|----------|--------|-------------|
| `validateNumericAuthority` | ADOPTED & context.NOT_SELECTED | `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD` | ✅ |
| `validateNumericAuthority` | ADOPTED & sourceLocator 空欄 | `AP00_NUMERIC_ADOPTED_MISSING_SOURCE` | ✅ |
| `validateNumericAuthority` | ADOPTED & decisionId 欠落 | `AP00_NUMERIC_ADOPTED_MISSING_DECISION` | ✅ |
| `assertNoNullCoercion` | null/undefined value (非 PLACEHOLDER) | `AP00_NUMERIC_NULL_COERCION` | ✅ |
| `rejectPlaceholderAsAdopted` | PLACEHOLDER consumed as ADOPTED | `AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED` | ✅ |
| `validateGoldenExpectedRegistration` | `GOLDEN_EXPECTED` fixture | `AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN` | ✅ |
| `validateNumericRecordForAdoption` | ADOPTED & NOT_SELECTED | `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD` (+ PLACEHOLDER) | ✅ |

> `numericAuthorityGuard.test.ts:52-58` — ADOPTED under NOT_SELECTED → `ok===false`, `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD`。

## 3. DS-09 数値実装許可ゲート (`08_numeric_authorization_gate.md`)

| 上位ゲート | 内容 | 現状 |
|-----------|------|------|
| GATE-NR-01 | DS-02..05 ソース/数値ブロッカー=0 | `BLOCKED` |
| GATE-NR-02 | 解析器機械証跡 | `BLOCKED` |
| GATE-NR-03 | Goldens 独立誘導/固定参照/承認 | `BLOCKED` |
| GATE-NR-04 | 固定版 SPACER 実セマンティック parity | `BLOCKED` |
| GATE-NR-05 | 未解決エビデンスブロッカー=0 | `BLOCKED` |
| GATE-NR-06 | 独立ガバナンスレビュー | `PASS` |
| GATE-NR-07 | リポジトリ/文書最終検証 | `PASS` |

→ 全部門 `BLOCKED`（NR-06/07 PASS でも補償不可）

### 部材・照査許可テーブル（DS-09 §2） — 全セル `NOT_AUTHORIZED`

| 部材 | 曲げ | せん断 | 軸力・安定 | たわみ | 疲労 |
|------|------|--------|------------|--------|------|
| **main_girder** | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | OUT_OF_SCOPE |
| **rc_deck** | NOT_AUTHORIZED | NOT_AUTHORIZED | — | NOT_AUTHORIZED | — |
| **cross_girder** | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | — | OUT_OF_SCOPE |
| **sway_bracing** | — | — | NOT_AUTHORIZED | — | — |
| **lateral_bracing** | — | — | NOT_AUTHORIZED | — | — |
| **stiffener** | — | NOT_AUTHORIZED | NOT_AUTHORIZED | — | — |
| **splice** | — | — | — | — | NOT_AUTHORIZED |
| **bearing** | — | — | — | — | NOT_AUTHORIZED |

> ※ このテーブルは **SIMPLE_SINGLE も CONTINUOUS も区別なく `NOT_AUTHORIZED`**。`PHASE1_REQUIRED` 照査は `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。

## 4. 境界テーブル — 連続橋(CONTINUOUS)の数値承認状態

| 数値対象 | 現ステータス | 根拠 |
|----------|--------------|------|
| 主桁断面断面量 (I, S, 面積) | NOT_AUTHORIZED / NOT_AVAILABLE | ReportModel CH-SECTION `:206-216`（CONTINUOUS は spanLength=null で `NOT_AVAILABLE`） |
| 主桁鋼体積 (QTY-MG-VALL) | NOT_AUTHORIZED | quantityModel ステータス (`bridgeStructureQuantities.test.ts`) |
| RC床版体積 (QTY-DK-VOL) | NOT_AUTHORIZED | 同 |
| 数量 CSV/JSON | UNVERIFIED_DEVELOPMENT_ONLY | `artifactBundle.ts:228-229` |
| **支点反力 (CH-REACTIONS)** | **NOT_AVAILABLE** | `reportModel.ts:238` `null` hardcode |
| **せん断力 (CH-SHEAR)** | NOT_AVAILABLE | `:243` |
| **曲げモーメント (CH-MOMENT)** | NOT_AVAILABLE | `:248` |
| **たわみ (CH-DEFLECTION)** | NOT_AVAILABLE | `:253` |
| 解析器 (solver/analysisType) | NOT_A_REAL_STANDARD | `:230-232` "scipy_sparse"/"linear_static" dev probe（CONTINUOUS と無関係） |
| 単位体積重量 (steel/rc) ADOPTED | **fail-closed** | `adoption.ts:87` + `BridgeStructureInputPanel.tsx:256` NOT_SELECTED |
| 単位体積重量 PENDING | 可能 (USER_PROVIDED_UNVERIFIED) | `generateBsdd.ts:418,448` |
| 単位体積重量 UNKNOWN | 可能 (null) | `generateBsdd.ts:436,442` |
| 報全体 authorizationStatus | NOT_GRANTED | `reportModel.ts:71` |
| designOrConstructionUse | PROHIBITED | `:72` |
| formalReport | NOT_AUTHORIZED | `outputIntegration.ts:128` (constant) |

## 5. ランタイム実施点（ENFORCEMENT POINT）

### 5-1. 単位体積重量 ADOPTED — UI 操作のゲート

```
frontend/src/apollo/components/BridgeStructureInputPanel.tsx:256
  const result = withAdoptedBridgeStructureUnitWeight(project, kind);
  // ↑ context 省略 → default NOT_SELECTED → fail-closed
```

→ `adoption.ts:87-126` → `validateBridgeSuperstructureDesignDocument(next, "", { numericAuthorityContext: NOT_SELECTED })` → `numericAuthorityGuard.validateNumericAuthority` → `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD` → `ok===false` → UI に `"数値設計権限が付与されていないため、単位体積重量を掃Adopted できません（ADOPTED は標準選定後にのみ有効）。"`。

> ■ **確認事項 NA-01:** `adoption.test.ts:53-64` は**CONTINUOUS fixture**（`fillContinuousBridgeStructureInput`）で `withAdoptedBridgeStructureUnitWeight(generated, "steel")`（context 省略）→ `ok===false`, `sourceLocator` は `user:apollo:vvs02:steel-unit-weight` プレフィックスだが**ADOPTED されない** (`PENDING` 維持)。`SELECTED_NUMERIC_CONTEXT`（テスト専用、`numericFixtures.ts:19-20`）でのみ ADOPTED 可能。

### 5-2. 解析結果 → 報へのバインド = 未実装

- `reportModel.ts:109-148`（`buildReportModel`）は `project.apolloPhase1Unit2` / `project.analysisResults` / `apolloAnalysis` を**参照しない**。
- CH-REACTIONS/SHEAR/MOMENT/DEFLECTION はコードリテラル `null` → `NOT_AVAILABLE` (`§2 DS-02`)。
- `appurtenanceHaunchAnalysisAdapter.ts:385`: `bridgeSystem !== SIMPLE_SINGLE` → "continuous/other systems use bridgeLength as a single simple-span idealization"。解析は**単径間理想化**。解析結果は ReportModel へ**一切渡されない**。

> ■ **確認事項 NA-02:** 連続橋の「解析」は存在せず、`BridgeSystem.CONTINUOUS` は解析器には渡らない。`spanLength===null` により `computeGirderSectionProperties` ガードも落ちる（`§3 DS-01`）。したがって**CH-SECTION も CH-REACTIONS も CONTINUOUS では NOT_AVAILABLE**。

## 6. adoptionStatus ライフサイクル

```
(Unknown) ──generate──▶ PENDING   (steelUnitWeight/rcUnitWeight 入力済み)
   │                          │
   │  user clicks "adopt"     │  user clicks "adopt" (runtime: NOT_SELECTED)
   ▼ NOT_AVAILABLE             ▼ fail-closed (ok:false "数値設計権限")
(ADOPT needs                     (adoption.ts:112-123 validateBridgeSuperstructureDesignDocument)
 TargetStandardStatus.SELECTED)   → ADOPTED は標準選定後のみ
```

| 状態 | 遷移条件 | コードパス |
|------|----------|------------|
| UNKNOWN | 入力未設定（value=null） | `generateBsdd.ts:418/448: rcUnitWeight!==null ? "PENDING" : "UNKNOWN"` |
| PENDING | 入力済み（value not null） | `:448/418 "PENDING"` |
| PENDING | reset (value not null) | `adoption.ts:138 "PENDING"` |
| UNKNOWN | reset (value=null) | `:138 null ? "UNKNOWN"` |
| ADOPTED | `withAdoptedBridgeStructureUnitWeight(ctx=SELECTED)` | `:107 "ADOPTED"` + sourceLocator=`user:apollo:vvs02:{kind}-unit-weight` + decisionId |
| ADOPTED (rejected) | runtime NOT_SELECTED | `BridgeStructureInputPanel.tsx:256` → ok:false |

> ■ **確認事項 NA-03:** ADOPTED は`decisionId=stableUuidFromSeed(projectId:Decision:adopt-{kind}-unit-weight)` で決定的。sourceLocator は `user:apollo:vvs02:{kind}-unit-weight` プレフィックス。いずれも**標準選定(Selected/Frozen)前では実現しない**。

## 7. 結論

- **承認境界は CONTINUOUS に関わらず一定**: 設計照査は `NOT_AUTHORIZED`（DS-09 全セル），解析結果は `NOT_AVAILABLE`（ReportModel 未バインド），出力は `UNVERIFIED_DEVELOPMENT_ONLY / PROHIBITED`（manifest）。
- **唯一の numerically-adoptable パス**（unitWeight ADOPTED）は**ランタイムで fail-closed**（ENFORCEMENT_POINT `@BridgeStructureInputPanel.tsx:256` → NOT_SELECTED）。
- **CONTINUOUS 特有の追加欠陃**: (a) `CH-SECTION` が `spanLength===null` ガードで `NOT_AVAILABLE`（DS-01），(b) 解析は simple-span idealization（NA-02）→ pier 反力/固定ピンク曲げモーメント等の**連続橋設計荷重状態は存在しない**。
- ゲート解放は `PA-OQ-001〜009`, `GATE-NR-01..05` のブロッカー解消 + `DEC-PHA-xxxx` セル昇格による。

### 補記
- 現 HEAD: `d975820`（local==origin/main，clean）。
- 次フェーズ: Phase 1-I (`08_gap_analysis.md`) → 09 → evidence_matrix.csv → completion_report。
