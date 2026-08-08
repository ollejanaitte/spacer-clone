# Phase 3 以降の推奨実装順序

> **Phase:** P5
> 各ステップは小さく分け、PR ごとに test / typecheck を実施。main へ段階 merge。

## BLOCKER 0（前提・先に解決）
1. `research/liner-terrain-fix-p01-coords`（①最新成果）を統合 baseline へ反映
   （integration branch で merge、無理なら main へ段階 PR）。**最初にやる。**

## Phase 3 実装順序（推奨）

| # | 作業 | 対象 | 依存 | 検証 |
|---|------|------|------|------|
| 3-1 | CBDM alignments への数値書き出し（Alignment→BP Adapter） | `linerDomainDraftRoadDesignMapper` 拡張 + CBDM | 0 | round-trip test |
| 3-2 | `CommonModelGeometryInputAdapter` 拡張（数値幾何を渡す） | `apollo/geometry/geometryInputAdapter.ts` | 3-1 | geometryInputAdapter.test 拡張 |
| 3-3 | WF-01 alignment-binding 実装（②が実線形を消費） | `apollo/workflow/capabilityRegistry`、`SuperstructurePipelinePanel` | 3-2 | apollo e2e |
| 3-4 | BridgeProject Adapter（②↔BP: snapshot/BSDD↔CBDM.bridgeGeometry + sharedFacts.supports） | contracts + apollo | 3-2 | contract test + golden parity |
| 3-5 | BridgeProject Adapter（③↔BP: sharedFacts.supports → Support[] 実線形配置） | `SupportPlacementEngine` を実行時 host に配線 | 3-4 | placement e2e |
| 3-6 | 反力経路（BFAD result ↔ sharedFacts.reactions、caseKind mapper） | contracts + apollo + substructure | 3-4 | 認証後に E2E（未認証は fail-closed 維持） |
| 3-7 | CASE A E2E（①→BP→②→BP→③） | 統合 test | 3-1..3-6 | Playwright e2e |
| 3-8 | CASE B 復元（②sample→BP→①reconstruction→②整合→③） | reconstruction 実装 + GeometryEngine 再実行 | 3-3, 3-7 | reconstruction test（DERIVED/INFERRED 分類） |

## Phase 4（将来）
- Model3D 共通 payload 契約（runtime の `BridgeGeometry3dPayload` を正規化）
- road-to-frame-transfer-package の producer 実装（①→② 正規経路）
- 下部工 formal Design Engine（A-01 契約を維持したまま実 engine 接続）

## 各 PR の検証ルール
- 影響範囲 test + `tsc -b`（typecheck）
- 契約変更は `npm run contracts:schema:generate`（JSON schema 再生成）を必ず commit
- 正式数値設計（Design Engine）は test が通っても「正式設計完成」と判定しない
  （NOT_AUTHORIZED / HOLD のまま）。認証ゲートは別途。
