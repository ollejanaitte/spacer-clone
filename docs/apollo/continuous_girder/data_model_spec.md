# 連続桁 — データモデル仕様

**Authority:** Step C0（設計文書。実装は C1）
**Date:** 2026-08-02

入力ドラフト・SDM・BSDD の連続桁表現を定義する。既存 `ApolloBridgeStructureInputDraft` を拡張し、SIMPLE_SINGLE との後方互換を維持する。

---

## 1. 入力ドラフト（C1 実装予定）

### 1.1 既存フィールド（継承）

`frontend/src/apollo/bridgeStructure/types.ts` の既存フィールドをそのまま使用する。
表示名は S1 適用済み（支間長・構造モデル長）。

### 1.2 追加フィールド（additive）

| フィールド | 型 | 責務 |
|------------|-----|------|
| `bridgeSystem` | `"SIMPLE_SINGLE" \| "CONTINUOUS"` | 構造形式（デフォルト: `SIMPLE_SINGLE`、レガシー互換） |
| `spanCount` | `number`（2〜5） | 明示的径間数。CONTINUOUS 時は必須 |

### 1.3 導出規則

**SIMPLE_SINGLE（既存）**

- `spanCount = 1`（暗黙または明示）
- `bridgeLength == spanLength`（単径間導出可）

**CONTINUOUS（新規）**

- `spanCount ∈ {2, 3, 4, 5}`
- `bridgeLength = spanLength × spanCount`（整数倍、`resolveSpanCount` と一致必須）
- 各径間は等支間長（非等支間は OUT_OF_SCOPE）

### 1.4 主桁断面

- 全支間・全主桁で同一断面パラメータ（`girderDepth`, フランジ・ウェブ寸法）
- `girderSectionSegments` は空配列のまま（区間別断面は OUT_OF_SCOPE）

## 2. SDM（Structural Design Model）

### 2.1 スパン

| 属性 | SIMPLE_SINGLE | CONTINUOUS |
|------|---------------|------------|
| `spans.length` | 1 | `spanCount`（2〜5） |
| `spans[i].length` | `spanLength` | 各 `spanLength`（等長） |
| `spans[i].continuity` | — | `"continuous"`（C1 で追加） |

### 2.2 支点（supports）

| 属性 | 値 |
|------|-----|
| 個数 | `spanCount + 1` |
| 端部（index 0, n） | `role: "abutment"`、簡易橋台幾何 |
| 中間（index 1..n-1） | `role: "pier"`、簡易橋脚幾何 |
| `fixity`（幾何のみ） | 端部: `pinned`、中間: `pinned` または `roller`（C1 で固定、照査なし） |
| `station` | `i × spanLength`（i = 0..spanCount） |

### 2.3 主桁・床版・横構

- `mainGirders`: `girderCount` 本、全長 `bridgeLength` 貫通（連続桁として一本化）
- `deck`: 全幅・全長の RC 床版ソリッド（非合成）
- `crossBeams` / 補剛材 / 対傾構: SIMPLE_SINGLE と同一生成規則（`bridgeLength` 基準）

### 2.4 designStatus

全エンティティ `NOT_AUTHORIZED`。正式照査への昇格は禁止。

## 3. BSDD（phase1ScopeAssertion）

| フィールド | SIMPLE_SINGLE | CONTINUOUS |
|------------|---------------|------------|
| `spanSystem` | `"simple"` | `"continuous"` |
| `alignment` | `"STRAIGHT"` | `"STRAIGHT"` |
| `girderDepth` | `"EQUAL"` | `"EQUAL"` |
| `deckType` | `"NON_COMPOSITE_RC_SLAB"` | 同左 |
| `girderSection` | `"PLATE_GIRDER"` | 同左 |

`bridgeSuperstructureDesignDocument` の `spanSystem` リテラルは C1 で `"continuous"` を additive 追加する（schema version 要検討）。

## 4. 永続化

- プロジェクト JSON の `apolloBridgeStructureInput` に `bridgeSystem` / `spanCount` を保存
- レガシー（フィールド欠落）→ `bridgeSystem = "SIMPLE_SINGLE"`、`spanCount = 1` と解釈
- `validateBridgeStructureInputPersistence` の allowed set を C1 で拡張
- 黙示的修正禁止: `bridgeLength` と `spanCount` の不整合は fail-closed

## 5. STALE 契約

SIMPLE_SINGLE と同一:

- 寸法編集 → `generatedAt = null`
- STALE 中は SDM サマリ非表示、3D ソリッド省略、数量 INCOMPLETE

## 6. 数値ゲート

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```
