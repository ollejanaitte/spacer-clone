# STEP 1-P02 — DATA_MODEL_SCHEMA_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本:** `schemas/contracts/v0.1/`・`frontend/src/contracts/`・Phase 5 契約（変更しない）

## 1. 主要データモデル一覧

| モデル | schema / type | 用途 | 単位 | ID | resolution state | persistence |
|--------|---------------|------|------|----|------------------|-------------|
| Common Bridge Data Model | `schemas/contracts/v0.1/common-bridge-data-model.schema.json` / `frontend/src/contracts/commonBridgeDataModel.ts` | 入力・永続化データ契約（Phase 5 frozen） | m / rad / kN | 安定 ID（`ALN-ACL`, `SUP-*`, `GIRDER-*`, `GRID-*`, `DECK-01`） | CONFIRMED / HCR / CONFLICT / HOLD / NOT_AVAILABLE | JSON（workspace / file） |
| Bridge Superstructure Design Document | `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json` / `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts` | 上部工設計条件・断面・荷重・解析 binding（Phase 7 入力） | m / kN / kN·m / kN/m² | 設計 entity ID（`mainGirders.*`, `rcDecks.*`, `crossBeams.*`） | 同左（`designStatus: NOT_AUTHORIZED` 等） | JSON（Common Model 側car） |
| GeometrySnapshot | `frontend/src/apollo/geometry/types.ts` | 橋梁 geometry runtime 正（6-1 実装済み） | m / rad | `SUP-LINE-*`, `GIRL-*`, `GP-*`, `XSEC-*` | ResolvedValue（同 5 状態） | 非永続（generation 毎に導出・immutable・fingerprint） |
| GeometryEngineInput | `frontend/src/apollo/geometry/contracts.ts` | Geometry Engine 入力（Input Adapter 出力） | m / rad | Common ID | `unresolved[]` 伝播 | 非永続 |
| Project Model | `frontend/src/types.ts`（`ProjectModel`） | 既存 FE モデル UI データ | m / kN | node/member/support 番号 | 有限値保証 | project.json（/api/projects/save・load） |
| Frame Analysis Result | `schemas/contracts/v0.1/frame-analysis-result-resource.schema.json` + IF3 正規化 | 解析結果（displacements/reactions/memberEndForces/eigen） | m / rad / kN / kN·m | result/case ID | 認証状態 | IF3 persistence |
| Superstructure Design Result（Phase 7 新規） | 設計結果ドキュメント（STEP 2 で schema 確定） | 照査結果・断面決定・traceability | m / kN / kN·m / MPa / % | 照査 item ID | NOT_AUTHORIZED → GRANTED | Common Model `design` + traceability |
| Substructure Project | `schemas/substructure/*` + `frontend/src/substructure/model.ts` | 下部工（別リサーチラボ） | m / kN | support/pier/footing/pile | 参考値・未検証 | substructure-project.schema.json |

## 2. ID 規則（層を跨いで失わない）

- Common ID（`ALN-ACL`, `SUP-*`, `GIRDER-*`, `GRID-*`, `DECK-01`, `NODE-*`）は
  Common Model → Geometry Input Adapter → GeometrySnapshot まで維持。
- GeometrySnapshot の ID は mapping 規則（`mapping/reference_bridge_001_geometry_mapping.csv`）に従う。
- 解析モデル・設計結果は元の Common ID へ traceability で遡れること（Golden ref / sourceRefs 保持）。

## 3. resolution state（全層で統一）

`CONFIRMED / HUMAN_CONFIRMATION_REQUIRED / CONFLICT / HOLD_INSUFFICIENT_SOURCE / NOT_AVAILABLE`

- 伝播規則: 入力で unresolved なら出力でも unresolved。途中で数値に捏造しない。
- RB-001 既知 unresolved: `CONF-P2II-001`（フランジ幅 680/700）、`HCR-001`（S141 OCR）、
  `HOLD`（中間格点 GRID/NODE 1002..1026, 2002..2026）、`analysisReference: NOT_AVAILABLE`。

## 4. 未定義 schema（STEP 2 で確定するもの）

| 対象 | 現状 | 決定 |
|------|------|------|
| 設計結果ドキュメント（照査・断面決定・traceability） | 未定義 | P05/P02 で形状を定義（Common Model `design` + `traceability` を拡張せず新規 resource） |
| 3D 表示モデル | 既存 `ApolloVisualizationModel`（frozen contract） | snapshot 由来へ拡張（P04 で確定） |
| Replay 結果 / discrepancy | 未定義 | P07 で確定 |

## 5. 禁止事項

- Phase 5 Common Model 契約（schemaVersion 1.0.0）の無断変更は禁止（変更は migration + seal 必要）。
- 既存 schema（project/bridge/result/substructure）の破壊的変更は禁止。
- 根拠のない新 schema 追加・Golden 自己生成は禁止。
