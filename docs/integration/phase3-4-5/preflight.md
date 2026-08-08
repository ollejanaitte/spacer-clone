# Phase 3-4/3-5 Preflight

> **Phase:** P0
> **Baseline:** origin/main `b8215ebaed659e45ad8ff84549fb07e706ef5487`
> **Branch:** `integration/phase3-4-5-super-substructure`
> **Worktree:** `/tmp/opencode/phase3-4-5-integration`

## 実測

| 項目 | 値 |
|------|-----|
| pwd | /home/masaharu |
| local main worktree | `4e79b3c`（stale。作業に使わない） |
| origin/main | `b8215eba`（Phase 3-3 完了） |
| local main vs origin/main | 0 ahead / 38 behind（stale） |
| open PR | 0 |
| dirty（main worktree） | `docs/apollo/step4c_appurtenance_haunch/evidence/*.json`（既存・触らない） |
| dirty（liner-r1 worktree） | 同上 + untracked `docs/liner/research/road-structure-ordinance/` |
| stash | なし |
| 既存 Phase 3 関連 branch/worktree | `integration/phase3-0..3-3`（merge 済み）、`research/liner-terrain-fix-p01-coords` |
| remote | `https://github.com/ollejanaitte/spacer-clone.git` |

## 保護対象（Phase 3-0..3-3）

- BridgeProject schema / validator / manifest / provenance
- Alignment / BridgeGeometry（`frontend/src/bridgeProject/`）
- ①→BridgeProject→② GeometryEngineInput 正規経路（Phase 3-3）
- 上部工 sample / 下部工 Calculation Adapter
- Save/Load / Replay / Main 3D Viewer / Electron
- NOT_AUTHORIZED 状態

## パッケージ / テスト構成

- frontend: TypeScript / React / Vite / vitest / Playwright（`frontend/`）
- backend: Python / FastAPI / pytest（`backend/`）
- 起動: `npm run dev` / `npm test`（vitest）/ `npm run typecheck`（tsc -b）/ `npm run test:e2e`（playwright）/ `pytest backend/tests`

## BridgeProject 関連コード位置

- `frontend/src/bridgeProject/`（alignmentAdapter / bridgeGeometryGenerator / cbdmDocument / superstructureBinding / types / validation）
- `frontend/src/contracts/`（CBDM schema / BridgeProject manifest）

## ②上部工 domain 位置

- `frontend/src/apollo/`（geometry / visualization / design / bridgeStructure / workflow / components/SuperstructurePipelinePanel）

## ③下部工 domain 位置

- `frontend/src/substructure/`（model.ts / design/calculationAdapter.ts / design/superstructureInterface.ts / SupportPlacementEngine / viewer3d / planning）
- `schemas/substructure/`（support-interface / substructure-project）

## Save/Load/Replay 位置

- `frontend/src/apollo/workspace.ts` / `importExport.ts` / `bridgeStructure/projectBsdd.ts`
- `frontend/src/substructure/planning/adapterPersistence.ts` / `persistence.ts`
- `frontend/src/bridgeProject/cbdmDocument.ts`（canonical JSON round-trip）
