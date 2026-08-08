# BridgeProject 最小契約

> **Phase:** P3
> **Authority:** TARGET DECISION / PLAN（Integration）
> **Contract 実装:** `schemas/contracts/v0.1/bridge-project.schema.json`
> **Runtime (zod source of truth):** `frontend/src/contracts/runtime/schemas/bridgeProject.ts`
> **TS mirror / validator:** `frontend/src/contracts/bridgeProject.ts`
> **Test:** `frontend/src/contracts/__tests__/bridgeProject.test.ts`

## 1. 目的

①道路線形 / ②上部工 / ③下部工 を、ファイル受け渡しの直列接続ではなく、
**共通正本としての BridgeProject** を中心に接続するための統括契約。

BridgeProject は「共有すべき設計事実」の**正本の置き場所**を宣言し、
各専門モジュールの**計算途中値**は各 owner 文書（BSDD / substructure project 等）に閉じる。

## 2. 位置づけ（既存契約層との関係）

```
EngineeringProject (manifest: road/frame refs)
        │
        ▼
BridgeProject (coordination manifest, documentKind "bridge-project")
  ├─ references.roadDesign      → road-design-document (RDD)        [①正本]
  ├─ references.commonModel     → common-bridge-data-model (CBDM)   [共有設計事実の正本]
  ├─ references.superstructure  → bridge-superstructure-design (BSDD) [②正本]
  ├─ references.analysis        → bridge-frame-analysis + result resource [解析正本]
  ├─ references.substructure    → substructure 文書 (schemas/substructure) [③正本]
  └─ references.model3D         → runtime 3D payload（契約外・参照のみ）
```

- CBDM は既存の共通橋梁モデル（alignments / bridgeGeometry / structuralModel /
  materials / sections / loads / analysisReference / design / report / drawing /
  traceability / resolutionRegistry）。
- BridgeProject は CBDM を**書き換えない**。owner・status・handoff 事実・
  reconstruction 記録を統括する。
- 単一 source of truth: 各 section の実値は references 先の文書。BridgeProject は
  **二重管理しない**。

## 3. スキーマ構造

| Section | 内容 | 実装 |
|---------|------|------|
| envelope | schemaId / documentId / documentKind=`bridge-project` / revisionId / contentChecksum / provenance | createCommonEnvelopeSchema 再利用 |
| projectId / name / projectRevisionMetadata | プロジェクト識別 | — |
| `status` | phase（road-alignment/superstructure/substructure/reconciliation/closed）+ 各 section の owner / state | `bridgeProjectStatusSchema` |
| `references` | 各 domain の正本文書参照（roadDesign/commonModel/superstructure/analysis/substructure/model3D） | `bridgeProjectReferencesSchema` |
| `sharedFacts` | クロスドメイン handoff 事実（support 系 + reactions） | `bridgeProjectSharedFactsSchema` |
| `reconstruction` | CASE B（②サンプル→①復元）の provenance 記録 | `bridgeProjectReconstructionSchema` |

### Owner enum
`ALIGNMENT_OWNER` / `SUPERSTRUCTURE_OWNER` / `SUBSTRUCTURE_OWNER` / `BRIDGE_PROJECT_SHARED`
（[responsibility-boundary.md](responsibility-boundary.md) の4領域と一致）。

### Section key enum
`project` / `alignment` / `bridgeGeometry` / `superstructure` / `substructure` /
`analysis` / `model3D` / `metadata`。

### Section state enum
`EMPTY` / `PARTIAL` / `COMPLETE` / `NOT_AUTHORIZED` / `DEFERRED`。

## 4. 共有値（BridgeProjectValue）

共有 handoff 値は次を持つ（[value-status-unit-policy.md](value-status-unit-policy.md)）:

- `value` — 数値/文字列/boolean または null
- `unit` — canonical 単位
- `status` — CONFIRMED / DERIVED / INFERRED / MISSING / DEFERRED / NOT_AUTHORIZED
- `source` — ORIGINAL / USER_INPUT / GENERATED_BY_TOOL / RECONSTRUCTED
- `generatedBy` — 生成 tool id
- `updatedAt` — ISO-8601 UTC
- `sourceReference` — golden / 参照

`sharedFacts` は**支持系と反力のみ**を保持する（橋長・支間・主桁配置等は CBDM が正本）。

## 5. Reconstruction（CASE B 復元・補完）

`reconstruction.entries[]` は各 field の復元 status を保持する:

| status | 意味 | 例 |
|--------|------|-----|
| CONFIRMED | 原本/入力値として確認済み | 橋長 134.001m（sample 由来） |
| DERIVED | 現行モデルから決定論的導出 | station→XYZ |
| INFERRED | 推定 | girder offset を主桁配置から推定 |
| MISSING | 不足（理由付き） | 縦断 profile なし |
| DEFERRED | 保留 | 曲線近似 deferred |
| NOT_AUTHORIZED | 未認証 | 反力・設計値 |

**FAIL-CLOSED:** 復元で `CONFIRMED` とすべきでない値に `CONFIRMED` を付けてはならない。
`DERIVED` / `INFERRED` を `CONFIRMED` に昇格するには人間確認を要する
（HUMAN_CONFIRMATION_REQUIRED または CONFLICT 解決として記録）。

## 6. 禁止事項

- **ドメイン payload の埋め込み禁止**: 道路線形本体・BSDD エンティティ・下部工幾何を
  BridgeProject に埋め込まない。`references` で参照する。
  → `detectForbiddenEmbeddedPayloadKeys` が構造上ブロック（runtime rule
  `BRIDGE_PROJECT_EMBEDDED_PAYLOAD_FORBIDDEN`）。
- **重複 support 禁止**: `sharedFacts.supports` の supportId は一意。
- **未知 section key / owner 禁止**: 契約語彙の外部拡張は extensions 経由。

## 7. 検証

- 構造: `bridgeProjectSchema.safeParse`（JSON Schema は zod から自動生成）
- 意味: `validateBridgeProject`（version / uuid / section / support 一意 / reaction /
  reconstruction status / 埋め込み禁止）
- JSON Schema drift: `contractJsonSchema.test.ts`（write mode で再生成）
- 単体: `bridgeProject.test.ts`

## 8. 関連する既存契約の変更（additive）

CBDM value-state に `DERIVED` / `INFERRED` / `DEFERRED` を追加（下位互換・追加のみ）。
`documentKind` に `bridge-project` を追加（document-reference / common-envelope の
enum に反映）。既存 fixture・値は無変更。
