# 15 Prototype 最小保存仕様（P18）

> Step 4-3 設計 → Prototype 段階実装計画。**設計のみ**（実装なし）。Phase 3 Protected Core は触らない。

## 0. 原則

- 段階ごとに動く最小実装。各 phase 終点で Save/Load/Replay round-trip を検証。
- Protected Core（BridgeProject canonical）は**reuse**するだけ。Core 変更なし。
- 実装は Phase 4-3 **後続タスク**。今回は計画。

## 1. Phase A — BusinessProject Folder + manifest + 最小 Save/Load

### 1.1 対象 (canonical docs)
- `business-project.json` — EngineeringProject extend schema（追加: roadRefs, bridgeProjectRefs, analysisRefs, sharedDatasetRefs?, deliverableRefs?）。**EXTENSION**: `engineeringProject.ts` / `runtime/schemas/engineeringProject.ts` に配列 refs を additive。
- `roads/<roadId>.road.json` — road-design document（既存 RoadDesignDocument）
- `bridges/<bridgeId>/{cbdm,manifest,superstructure,substructure}.json` — Protected Core verbatim
- `analyses/<analysisId>/document.json` — bridge-frame-analysis document
- `resources/<sha>.<ext>` — ImmutableResourceReference

### 1.2 実装タスク
1. `BusinessProjectFolderStore`（file-backed）: `open(path)` → read+validate(business-project.json)；`save(project)` → canonical serialize → WritePlan → AtomicJsonStore publish each child → manifest last (P8/P9 A).
2. `FileRevisionedDocumentRepository<T>`（`RevisionedDocumentRepository` パターンをファイル化）: `create`→`AtomicJsonStore.create_only`；`appendRevision`→`expected_checksum`. backend `atomic_json.py` reuse；frontend Electron main に fsync+replace equivalent。
3. manifest `contentChecksum` = canonicalJsonForChecksum(excluding checksum) → P8 invariant。
4. reference validation on open/save（dangling + checksum + revision）。

### 1.3 受入検証 (Case 1,2,3,12)

## 2. Phase B — Autosave / Recovery / History
1. autosave: 5s idle debounce → `.system/autosave/` staging (formal revision 非触) + autosave.meta.json, 3世代 keep。
2. crash journal: intent log → child publish → manifest commit → commit marker。
3. startup: commit marker check → recovery candidate 比較。
4. history: `.system/history/<rev>.json` append on formal save。
### 受入: Case 4, 5

## 3. Phase C — Resources / Deliverables / Package / Catalog / Migration
- resource binary content-addressing (`resources/<sha>`, ImmutableResourceReference)
- deliverable doc + resource refs (`deliverables/<id>/`)
- package export/import (zip + zip-slip guard + ID remap)
- project catalog (catalog.json + scanWorkspace rebuild)
- migration adapter (project.json → BusinessProject, dry-run, non-destructive)
- Quick Analysis 独立 (analysis-project.json + copy in/out)
### 受入: Case 6,7,8,9,10,11

## 4. ロードマップ

```
Phase A (must): manifest + Road + BridgeProject(Protected) + Analysis save/load
Phase B (must): autosave / recovery / history
Phase C (should): resources / deliverables / package / catalog / migration / quick-analysis
Phase D (future): backend BusinessProject REST / SQLite catalog / git-like history
```

## 5. 工数見積もり (design-only ではなく実装予定, person-days)

| Phase | 目安 | ポイント |
|-------|------|----------|
| A | 3-5 | manifest extend, FileRevisionedDocumentRepository, AtomicJsonStore file wrapper, save/load, round-trip test |
| B | 2-3 | autosave staging, crash journal, recovery candidate logic, history log |
| C | 5-8 | resources, deliverables, package zip+guard+remap, catalog scan, migration adapters |
| D | future | backend REST, catalog DB, incremental backup |

> 注: BridgeProject canonical 保存を**置き換える**実装は含まれない（Protected Core）。
> BusinessProject が BridgeProject canonical docs を配列・参照・アトミック保存する層を追加する。
