# Phase 3-0 Closeout — 道路線形最新成果の main 安全統合

> **Phase:** P5 (closeout)
> **Baseline main:** `665a7b2e76208622c2c367c6a79eb3a90298c887`
> **Final main:** `1b05b7558a08770054adf4f72d8a202a6cdea17c`
> **Source:** `origin/research/liner-terrain-fix-p01-coords` `c7d7774`
> **Integration branch:** `integration/phase3-0-liner-main`

## 1. Merge Ledger（Phase 3-0）

| PR | 内容 | merge SHA |
|----|------|-----------|
| #723 | P0 統合監査 manifest | `f8696f71724b40125330f6a84fe5e10f120ded4a` |
| #724 | P1 liner core（geometry3d / visual / output / tests）+ main3d route | `672bb0314f323a8e1c4abdd2489149719eab88bc` |
| #725 | P2 Main3D Viewer + 山岳500m sample + ページ統合 + App.tsx wiring | `9a390f58cc82de468143f8685cab6b24283b65fd` |
| #726 | P3 backend Rule Engine（X2-X4）+ tests | `d221422c1d12d75fea05887d73ef6764da3a9441` |
| #727 | P4 docs/liner phase docs + frontend e2e | `1b05b7558a08770054adf4f72d8a202a6cdea17c` |

方式: **selective file-level integration**。一括 merge は行わず、research の
追加ファイルのみ持ち込み + 共有ファイルは main 版を土台に research の追加分を付与。
**全 PR を通じて削除ファイル 0**（580 ファイルの巻き戻しを防止）。

## 2. 統合した道路線形成果（NEED_TO_INTEGRATE）

- `frontend/src/liner/core/geometry3d/`（3D payload 契約 + builders）
- `frontend/src/liner/core/visual/`（visual contract / live preview / 図式化）
- `frontend/src/liner/core/output/`（replay result）
- `frontend/src/liner/core/__tests__/`（9 tests）
- `frontend/src/liner/pages/LinerMain3DPage.tsx`（Main 3D Viewer）
- `frontend/src/liner/samples/mountain-viaduct-500/`（山岳連続高架橋500m: terrain / substructure / bridge / fixture / viewer / threeCoords 座標修正）
- `backend/rule_engine/`（X2-X4: Rule Engine / Geometry Kernel / Alignment solver / Cross Section generator / geometry3d / output）
- `docs/liner/research/phase-{main3d,mountain-sample,step1,step2,step3,ux-reaudit,x2,x3,x4a,x4b,x4c,x4d}/`（123 docs）
- `frontend/tests/e2e/`（camera-presets / mountain-3d-viewer / mountain-main3d / mountain-sample-workflow / s3-ux10-schematic）
- `frontend/src/liner/uiPreparation.ts`・`App.tsx`・`LinerGridPreview`・`LinerLauncherPage`・`LinerPreviewPage`（main 版 + 追加分）

## 3. 保護・巻き戻しなし（確認済み）

| 対象 | 確認 |
|------|------|
| `frontend/src/substructure/**` | 残存（substructure 系 e2e + 全 unit PASS） |
| `frontend/src/apollo/{geometry,design,visualization,replay,components}` | 残存 |
| `frontend/src/contracts/**`・`schemas/contracts/v0.1/*` | 残存（contracts suite PASS） |
| `docs/integration/**` | 残存 |
| `docs/apollo/**`（306 files） | 残存 |
| `substructure-planning/**` | 残存 |
| `frontend/src/i18n/ja.ts`（substructure ブロック） | main 版維持 |
| `frontend/src/api/client.ts`（analyzeGrillage） | 残存 |
| `backend/app/main.py`（/api/design/analyze） | 残存 |
| `backend/tests/test_grillage.py` | 残存 |
| `frontend/tests/e2e/{adapter,substructure,step3-superstructure-pipeline}` | 残存 |
| `AGENTS.md`（Standard Git Workflow） | main 版維持 |
| `schemas/project.schema.json` | main 版維持 |

## 4. Regression 結果（final main `1b05b75`）

| 検証 | 結果 |
|------|------|
| frontend typecheck（tsc -b） | PASS |
| frontend vitest full | **417 files / 3146 tests PASS** |
| contracts + substructure + apollo | 149 files / 1224 tests PASS |
| liner（含 samples / Main3D page） | 164 files / 1010 tests PASS（samples+Main3D 86 tests） |
| backend pytest | **1077 PASS** |
| e2e: mountain-sample-workflow | 2 PASS |
| e2e: mountain-main3d / camera-presets | 4 PASS |
| e2e: mountain-3d-viewer / s3-ux10-schematic | 3 PASS |
| e2e: adapter-normal-path（既存保護確認） | 2 PASS |

## 5. Feature 確認（実測）

- 山岳連続高架橋500m: サンプルカード → setup populate（e2e + unit）
- 総延長 500m / 橋長 400m / 8 径間 / A1・A2 + P1〜P7（unit fixture 検証）
- terrain 3D（DISPLAY_LAYER）+ threeCoords（y-up 変換の統一）
- Main 3D Viewer: 統合3D・model switch・layer toggle・camera presets・選択ハイライト（e2e）
- Save/Load・Replay: 既存 route の unit が全 PASS（App.linerSaveLoad 等）

## 6. Phase 3-1 readiness

**GO** — ただし Phase 3-1（Alignment→BridgeProject Adapter）の前提は以下:

- ①道路線形最新成果が main に存在（本 Phase で達成）
- CBDM alignments への数値書き出し（linerDomainDraftRoadDesignMapper 拡張）
- ③下部工・②上部工・BridgeProject は無傷

残る blocker は [docs/integration/blockers.md](../blockers.md) の
B0（①統合）が解消された。B1（反力 NOT_AUTHORIZED）等は Phase 3-1 以降のスコープ。

## 7. 今後

- Phase 3-1: Alignment→BridgeProject Adapter（CBDM alignments への数値書き出し）
- 未統合のローカル調査資料 `docs/liner/research/road-structure-ordinance/` は
  未追跡（ローカル）のため、本統合には含めない（必要なら別途 PR）。
