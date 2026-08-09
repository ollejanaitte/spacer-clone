# Phase 4 / Step 4-6-1 Legacy Storage Format Inventory

> Authority: Phase 4 Step 4-6 Migration & Compatibility — Legacy Inventory (docs-only)
> Baseline: origin/main `88bce13ff68b2ab0ca96f6e80f1279115831645f`
> Branch: `docs/phase4-step4-6-1-legacy-inventory`

## 1. 目的

BusinessProject（schemaVersion 0.2.0 engineering-project）へ移行する際に、
**破壊しない**対象となる既存の保存形式を棚卸しする。本 PR は docs-only（実装は 4-6-2 以降）。

## 2. 既存保存形式（実測）

### 2.1 project.json（SPA の正本 export）
- 実装: `App.tsx` `saveProject` / `openProjectViaDialog`（`desktop/projectFileDialog.ts` 経由で Electron native dialog / browser download）。
- 形式: `JSON.stringify(project, null, 2)`（非決定的）。ProjectModel（FEM + liner + apollo sidecars + superstructure sidecar）。
- 現状の保存先: native filesystem（Electron）または download（browser）。
- **migration 対象**: project.json → BusinessProject のうち、road/bridge/analysis に該当する内容を抽出。

### 2.2 localStorage（Apollo / Importer）
- `apollo_phase1_nn_workspace_v1`（Apollo Phase 1-NN workspace）
- `spacer.importer.projects.index` / `spacer.importer.project.<id>` / `spacer.importer.snapshot.<id>` / `spacer.importer.recovery`（PDF importer）
- `apollo_phase1_onboarding_dismissed` / `apollo_phase1_sample_guide_dismissed`（UI状態、migration不要）
- **migration 対象**: workspace / importer project の設計データ。

### 2.3 backend saved projects
- `backend/data/projects/autosave.json`（SPA autosave）
- `backend/data/bridges/<id>.json`（bridge CRUD、Phase 3 canonical 由来）
- **migration 対象**: autosave → BusinessProject の編集復元候補。bridges は BridgeProject canonical として子 Entity 化。

### 2.4 substructure-project.json
- 実装: `SubstructurePlanningHost.tsx`（download `substructure-project.json`）。
- 形式: SubstructureProject + AdapterEnvelope（下部工専用）。
- **migration 対象**: substructure データ → BusinessProject の substructure 子 Entity。

### 2.5 BridgeProject canonical（Protected Core）
- CBDM / manifest / superstructure / substructure の canonical JSON 4 文書（`cbdmDocument.ts` serialize/parse）。
- **migration**: verbatim 再利用（BusinessProject の子 Entity として配置・参照）。**Core 変更なし**。

### 2.6 その他 artifacts
- 散在 CSV/JSON/STL/DXF（displacements.csv / result.json / liner_*.dxf / liner_frame.stl / *.apollo.json / 計算結果系）。
- **扱い**: 将来の resource（`resources/<sha>.<ext>`）対象。今回の migration では変更しない。

## 3. migration 方針（4-6-2 以降）

1. **dry-run 設計**: 旧データ → preview → validation → migration plan → 新 BusinessProject（**元データ上書き禁止**）。
2. **adapter**: BridgeProject canonical は verbatim 再利用。project.json / substructure-project.json から
   推測で値を fabrication しない（MISSING は MISSING のまま）。
3. **compatibility**: Electron native fs / browser（in-memory + download fallback）/ Windows・Linux path /
   相対 refs / 日本語 path / 旧 project.json read を維持。
4. **Protected Core**: BridgeProject canonical schema / validator / manifest は無変更。

## 4. 実装禁止

- 旧データ破壊的 migration / 上書き。
- INFERRED/MISSING を自動 CONFIRMED 化。
- BridgeProject canonical 再設計。
- history rewrite / force push。
