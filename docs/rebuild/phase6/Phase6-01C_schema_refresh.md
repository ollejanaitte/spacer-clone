# Phase 6-01 Step C: Schema Refresh（凍結案）

## 1. 目的

Phase 6-00で確認されたfrontend model v0.2.0 vs schema v0.1.0のdriftを解消する設計を確定する。
canonical schema version・version bump・旧document migration・parser寛容化範囲・runtime source of truthを凍結する。

- baseline: `261b2b068c336e374390b2e0ca6ffe01f9724a91`（Step B merge後）
- 日付: 2026-08-13

## 2. 現状の問題

| schema | version | 問題 |
|---|---|---|
| `schemas/substructure/substructure-project.schema.json` | 0.1.0 | frontend model/serializer（v0.2.0: placement/pileGroup/portal_frame/wall/cantilever_frame）と不整合・runtime未使用・自動testなし |
| `schemas/substructure/support-interface.schema.json` | 0.1.0 | frontend parserはschemaより寛容（required不一致） |
| `schemas/substructure/pier.schema.json` | なし | enumがfrontend（portal_frame/wall）より狭い |
| `schemas/substructure/abutment.schema.json` | なし | enumがfrontend（cantilever_frame）より狭い |
| `schemas/substructure/foundation.schema.json` | なし | pileType enumがfrontend（steel_pipe）より狭い |

## 3. 正規方針（凍結）

### 3.1 canonical schema version

- **SubstructureDocument schemaVersion = `0.1.0`**（新PDC正本・Phase6-01A Contract準拠）
- **旧SubstructureProject（model.ts）は canonical型参照**（内部v0.2.0構造を保持しつつ新Documentに組込）
- **runtime source of truth = frontend型（model.ts + new SubstructureDocument型）**。JSON Schemaはドキュメント/外部検証用

### 3.2 version bump方法

- 新SubstructureDocument: v0.1.0（新規・独立schema）
- 旧`substructure-project.schema.json`: **0.1.0→0.2.0へ刷新**（frontend実装と一致させる）・`$id`更新
- `pier/abutment/foundation/pile` schema: frontend enumへ拡張（0.2.0）
- `support-interface.schema.json`: **0.1.0維持**（Phase 5互換・6課題解決後のmappingに合わせrequired/フィールド調整）

### 3.3 old document migration

- 旧0.1.0 project JSON（substructure-planning/examples/sample-project.json）:
  - `name/origin/position必須` → 新0.2.0（placement方式）へのmigration関数を定義
  - 旧: `position`（XYZ直接） / 新: `placement`（liner|direct_xyz）
  - 旧: pier `single_column_rect` / 新: `portal_frame`/`wall`追加
- **unsupported version reject**: 0.1.0以外（0.0.x等）はparse reject（fail-closed）
- 旧0.2.0（現行）は新Documentへcanonical型としてそのまま組込可（互換）

### 3.4 parser寛容化範囲（support-interface）

- `parseSupportInterface`は現状requiredを要求しない（寛容）
- 新方針: **strict required（正規）＋lenient（旧互換）**の二段
  - strict: schemaVersion/supportId/supportType/coordinateSystem/unitSystem/position/origin（正規受領）
  - lenient: 旧fixture（position欠落等）は**構文受領のみ（COMPATIBILITY_ONLY）**・警告付き。
  正規化後にstrict validationを通らない限り**canonical write禁止**（canonicalへは進めない）
- runtimeはfrontend parser（validation.ts流儀）をsource of truth

### 3.5 test fixtures

- 新fixture: substructure-document-valid.json / support-interface-v0.1.0-valid.json（6課題解決後）
- 旧fixture: reference-bridge-001-support-interface.json（互換検証用・そのまま維持）
- schema検証test: `schemas/substructure/*`をfrontend serializer出力に対して実行（drift検出を自動化）

## 4. Schema更新対象・内容

| schema | 更新 | 内容 |
|---|---|---|
| substructure-project | 0.1.0→0.2.0 | placement方式・portal_frame/wall/cantilever_frame・pileGroup・steel_pipe・name/origin optional化 |
| pier | 0.2.0 | single_column_rect/wall/portal_frame・columns/beam |
| abutment | 0.2.0 | inverted_t/cantilever_frame・backwall/wingWall |
| foundation | 0.2.0 | spread/piled・footing |
| pile | 0.2.0 | bored_pile/steel_pipe・pileGroup |
| support-interface | 0.1.0維持 | 6課題解決後のmapping（bearingPosition axis・caseKind enum・seatId BRG-）を反映 |

## 5. 旧model.tsとの整合（canonical型）

- model.ts（v0.2.0）の`Support/PierData/AbutmentData/Footing/PileGroup/BearingSeat`は
  **新SubstructureDocumentのcanonical入力型**としてそのまま利用
- 新schema（0.2.0）はmodel.tsと一致させる（JSON Schema生成 or 手動同期・testで担保）

## 6. fail-closed 統合

1. unsupported schemaVersion → parse reject
2. schemaとruntime型の不一致 → testで検出（drift防止）
3. 旧document migration不能 → reject（内容保持で破棄しない）
4. parser strict/lenient二段・lenientは警告明示

## 7. テスト（T6-SCH系）

- T6-SCH-001: 新SubstructureDocument v0.1.0準拠
- T6-SCH-002: schema 0.2.0とfrontend serializer出力の一致（drift検出）
- T6-SCH-003: 旧0.1.0 project migration（position→placement）
- T6-SCH-004: unsupported version reject
- T6-SCH-005: support-interface strict/lenient二段
- T6-SCH-006: pier/abutment/foundation/pile enum拡張
