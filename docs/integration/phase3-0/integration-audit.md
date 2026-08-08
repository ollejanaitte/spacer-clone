# Phase 3-0 統合監査 — 道路線形最新成果の main 安全統合

> **Phase:** P0 (preflight / inventory)
> **Baseline:** origin/main `665a7b2e76208622c2c367c6a79eb3a90298c887`
> **Source branch:** `origin/research/liner-terrain-fix-p01-coords` `c7d7774f1acbfb437f0ad6e799efb2d87a923f6a`
> **Integration branch:** `integration/phase3-0-liner-main`
> **方式:** selective file-level integration（機械的一括 merge は行わない）

## 1. Preflight 実測

| 項目 | 値 |
|------|-----|
| local main worktree HEAD | `4e79b3c`（origin/main より古い。作業に使わない） |
| origin/main | `665a7b2e`（Phase 1-2 完了時点） |
| origin/research/liner-terrain-fix-p01-coords | `c7d7774` |
| merge-base | `6a8f128` |
| ahead / behind（main...research） | **215 ahead / 271 behind** |
| open PR | 0 |
| dirty（main worktree） | `docs/apollo/step4c_appurtenance_haunch/evidence/*.json`（既存・触らない） |
| dirty（research worktree） | 同上 + untracked `docs/liner/research/road-structure-ordinance/`（ローカル調査資料・commit 対象外） |
| stash | なし |

**結論:** research は main より **271 commit 古い**ため、research のツリーには
main の後発成果（下部工 phase-c1、上部工 apollo geometry/design、BridgeProject、
docs/integration、docs/apollo 等 580 ファイル）が**存在しない**。
一括 merge はそれらを巻き戻すため禁止。**選択的統合**を採用。

## 2. 統合対象の分類（feature 単位）

凡例: ALREADY_IN_MAIN / NEED_TO_INTEGRATE / SUPERSEDED / EXCLUDE_WITH_REASON / CONFLICT_REQUIRES_RESOLUTION

| # | 機能 | 判定 | 根拠・対応 |
|---|------|------|-----------|
| A | Step3 UI（liner core / schema / adapters） | ALREADY_IN_MAIN | `core/types.ts`・`schema/types.ts`・`linerDomainDraftRoadDesignMapper.ts` は main と byte 同一（Phase 1-2 確認） |
| B | horizontal alignment UI | ALREADY_IN_MAIN | 同上 |
| C | vertical profile UI | ALREADY_IN_MAIN | 同上 |
| D | crossfall / cross section UI | ALREADY_IN_MAIN | 同上 |
| E | bridge geometry UI | ALREADY_IN_MAIN | 同上 |
| F | project state / Save-Load | ALREADY_IN_MAIN | RDD 0.1.0 / domainDraft 0.3.0 は同一 |
| G | Replay（liner） | ALREADY_IN_MAIN（基盤） | 追加の `core/output/replayResult.ts` + `core/visual/livePreview.ts` は NEED_TO_INTEGRATE |
| H | geometry3d payload（TS） | NEED_TO_INTEGRATE | `frontend/src/liner/core/geometry3d/`（3 files） |
| I | visual contract / live preview | NEED_TO_INTEGRATE | `frontend/src/liner/core/visual/`（8 files）・`core/output/`（2 files）・`core/__tests__/`（10 tests） |
| J | mountain-viaduct-500 sample | NEED_TO_INTEGRATE | `frontend/src/liner/samples/mountain-viaduct-500/`（30 source + 17 tests） |
| K | terrain 3D（DISPLAY_LAYER） | NEED_TO_INTEGRATE | sample 内 `terrain.ts` |
| L | substructure 3D markers / meshes | NEED_TO_INTEGRATE | sample 内 `substructure.ts` / `markers.ts`（表示のみ） |
| M | Main 3D Viewer | NEED_TO_INTEGRATE | `pages/LinerMain3DPage.tsx` + `liner.main3d` route |
| N | model / layer switch | NEED_TO_INTEGRATE | `viewerSwitch.ts` / `selection.ts` |
| O | camera presets | NEED_TO_INTEGRATE | `camera.ts` / `fixture.ts` |
| P | terrain coordinate fixes（threeCoords） | NEED_TO_INTEGRATE | `threeCoords.ts`（y-up 変換の統一） |
| Q | Electron 連携 | NEED_TO_INTEGRATE（導線） | `App.tsx` への Main3D route 配線。Electron 本体変更なし |
| R | backend Rule Engine（X2-X4） | NEED_TO_INTEGRATE | `backend/rule_engine/`（75 files）+ `backend/tests/`（49 files）。standalone・API 未接続 |
| S | docs/liner phase docs（X2/X3/X4a/X4b/X4c/X4d/Step1/2/3/main3d/mountain/ux-reaudit） | NEED_TO_INTEGRATE | `docs/liner/research/phase-*`（123 files） |
| T | frontend e2e（mountain / main3d / camera / schematic） | NEED_TO_INTEGRATE | `frontend/tests/e2e/`（5 specs） |

## 3. 除外・巻き戻し防止一覧

research 側で**消えている**（=main が持っている）ため、決して research 版に置き換えない。

| 対象 | 理由 |
|------|------|
| `frontend/src/substructure/**` | main の下部工 phase-c1（42+38+12+... ファイル） |
| `frontend/src/apollo/{geometry,design,visualization,replay,components}/*` | main の上部工最新 |
| `frontend/src/contracts/**`・`schemas/contracts/v0.1/*` | BridgeProject 等 Phase 1-2 成果 |
| `docs/integration/**` | Phase 1-2 成果 |
| `docs/apollo/**`（306 files） | 上部工文書 |
| `substructure-planning/**` | 下部工研究 |
| `frontend/src/i18n/ja.ts` | research は substructure ブロックを削除 → main 版を維持 |
| `frontend/src/api/client.ts` | research は `analyzeGrillage` を削除 → main 版を維持 |
| `backend/app/main.py` | research は `/api/design/analyze` を削除 → main 版を維持 |
| `backend/tests/test_grillage.py` | research は削除 → main 版を維持 |
| `frontend/tests/e2e/{adapter,substructure,step3-superstructure-pipeline}.spec.ts` | research は削除 → main 版を維持 |
| `AGENTS.md` | research は Standard Git Workflow を削除 → main 版を維持 |
| `schemas/project.schema.json` | research 版は substructure $ref なし（古い）→ main 版を維持 |

## 4. 競合ファイルの処理（research の追加分を main に付与）

| ファイル | 処理 |
|----------|------|
| `frontend/src/liner/uiPreparation.ts` | main 版 + `liner.main3d` route/path 追加。substructure route は維持 |
| `frontend/src/App.tsx` | main 版 + LinerMain3DPage / mountain sample / Main3D route / launcher sample 追加。substructure route・grillage は維持 |
| `frontend/src/liner/pages/LinerEditPage.tsx` | 変更なし（research は substructure ボタン削除のみ。main 版を維持） |
| `frontend/src/liner/components/LinerGridPreview.tsx` | main 版 + visual state 表示（research の追加のみ適用） |
| `frontend/src/liner/pages/LinerLauncherPage.tsx` | main 版 + 山岳サンプルカード追加 |
| `frontend/src/liner/pages/LinerPreviewPage.tsx` | main 版 + 3D プレビューパネル / Main3D ボタン追加 |
| `frontend/src/liner/__tests__/uiPreparation.test.ts` | main 版 + main3d route テスト追加 |

## 5. 統合順序（PR plan）

| Phase | 内容 | 対象 |
|-------|------|------|
| P0 | 本監査文書 + plan | docs/integration/phase3-0/ |
| P1 | liner core（geometry3d / visual / output / tests）+ uiPreparation route | frontend |
| P2 | Main3D page + mountain sample + pages + App.tsx wiring | frontend |
| P3 | backend rule_engine + backend tests | backend |
| P4 | docs/liner phase docs + frontend e2e | docs / e2e |
| P5 | closeout（full regression / ledger / readiness） | 検証 |

## 6. 検証方針

- 各 PR: 影響範囲の unit test + `tsc -b`（frontend）+ `pytest`（backend）
- 主要 regression: frontend vitest full + backend pytest full + contracts suite + BridgeProject validator
- 保護確認: substructure / apollo / BridgeProject / docs/integration が main に残ること
- 山岳500m・Main3D・terrain・A1/A2・P1-P7・spans・camera を e2e / unit で確認
