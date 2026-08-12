# Phase 6-01 Step C: Terrain / Existing 接続設計（凍結案）

## 1. 目的

Phase 6-00でL0だったTerrain / Existing integrationを正式仕様化する。
Terrain / Existing正本は複製しない（ID/reference接続）。

- baseline: `261b2b068c336e374390b2e0ca6ffe01f9724a91`
- 日付: 2026-08-13

## 2. Terrain接続

### 2.1 terrainElevation取得元

- **Terrain Module（modules.terrain）が正本**。下部工側は参照のみ
- 取得: `bridgeLayoutPlacement.lookupTerrainElevation`（Phase 4既存KEEP）or Terrain Module公式API
- support位置ground elevation = terrainElevation(support XYZ)

### 2.2 基礎高さ・根入れの導出（derived・凍結）

| 項目 | 導出 |
|---|---|
| support ground elevation | terrainElevation(support位置) |
| abutment height | 上部工Handoff support elevation - ground elevation（or design基準） |
| pier height | 同上 |
| footing top | canonical入力（topElevation） |
| footing bottom | derived = topElevation - thickness |
| foundation embedment | **derived = ground elevation - footingBottomElevation**（正値方向・単位m・統一） |
| pile head | derived（= footing bottom or 既定） |
| pile tip | derived（= pile head - pileLength） |

- **根入れ計算はPhase 6-02で実装**（ground elevationからembedmentを導出）
- 自動最適化・自動干渉回避: **Phase 6-02では実装しない**（Phase 6-01で明示的にDEFER）

## 3. Existing接続

### 3.1 Existing Conditions reference

- **Existing Conditions（modules.existingConditions）が正本**。下部工側は参照のみ
- `existingConditionsReference: { moduleId: "existingConditions", documentReferenceId }`（ID参照・ContractのexistingReferencesと同名に統一）

### 3.2 interference情報

- 下部工周辺のExisting entity（河川/道路/鉄道/橋梁/パイプ等）を
  `bridgeLayoutPlacement.collectExistingNearRange`（Phase 4既存）で取得（derived参照）
- Phase 6-02では**情報表示のみ**（自動干渉回避・自動最適化はしない）
- interferenceの数値判定は後続Phase（FEM/成果品）で扱う

## 4. missing / stale の扱い（凍結）

| 状態 | 扱い |
|---|---|
| missing terrain | warning（geometry生成可・embedmentは保留・fail-open明示） |
| missing existing | warning（interference情報なし・geometry生成可） |
| stale terrain | derived不一致検出（fingerprint/version）→ STALE・再取得 |
| stale existing | 同上 |

- validation: terrainReference/existingReferenceの整合（dangling検出）・欠落はwarning（fatalにしない）

## 5. 自動化の決定（Phase 6-02範囲の明示）

| 自動化 | Phase 6-02で実施 |
|---|---|
| 自動embedment計算 | ✅（ground elevation→基礎高さ・根入れ導出） |
| 自動干渉回避 | ❌（DEFER・情報表示のみ） |
| 自動最適化（形状調整） | ❌（DEFER） |
| 自動補正（高さ合わせ） | ❌（DEFER・ユーザー編集を正とする） |

## 6. fail-closed 統合

1. Terrain/Existing正本は複製しない（ID/reference）
2. missing/staleはwarning（geometry生成は継続・fatalにしない）
3. 自動補正・自動最適化はしない（正本を勝手に変えない）
4. embedment計算入力が欠落 → 計算保留（NOT_AVAILABLE・発明しない）

## 7. テスト（T6-TER系 / T6-EXT系）

- T6-TER-001: terrainElevation取得（support位置）
- T6-TER-002: embedment導出（ground→footing/pile）
- T6-TER-003: missing terrain=warning
- T6-TER-004: stale terrain=STALE検出
- T6-EXT-001: existing reference（ID参照）
- T6-EXT-002: nearby entity取得（collectExistingNearRange）
- T6-EXT-003: missing existing=warning
