# 13 Migration Strategy 設計（P16）

> 現行保存経路 → 新 BusinessProject 保存構造への**非破壊**移行方針。
> 原則: destructive migration 禁止 / 元データ保持 / 前backup / dry-run / rollback。
> 実装は**しない**（設計のみ）。→ EXTENSION_PROPOSAL / future。

## 0. 現行保存経路（006 棚卸し）

| 経路 | 分類 | 移行方式 |
|------|------|----------|
| `project.json`（download / Electron native） | KEEP（→移行） | import adapter |
| `localStorage` apollo workspace（13 keys） | WRAP→移行 | snapshot import |
| `backend/data/projects/*.json` / `autosave.json` | WRAP（latent） | 選択的 import |
| `backend/data/bridges/<id>.json` | WRAP（BridgeWizard, latent） | BridgeProject として再利用 or import |
| `substructure-project.json` | WRAP | substructure doc として import |
| BridgeProject CBDM/manifest canonical JSON | PROTECTED_CORE | **そのまま** bridgeProject document へ再利用 |
| 派生成果物（CSV/PDF/DXF/STL/ZIP/JSON/SVG/PNG） | WRAP(scattered) | deliverable へ promote |
| IF3 sidecar / server save（latent） | LATENT | 廃止 or extension 選択 |

## 1. 移行方式：import adapter（non-destructive）

- `migrate <source> --dry-run --to <newProject>` → **dry-run/プレビュー**。
- adapter は**読み取り専用**。元 `project.json` / localStorage / backend は**触らない**。
- import 成功 → **新 BusinessProject folder** に書き出し。元はバックアップ保持。
- migration は `migration-record` documentKind（`contracts/migrationRecord.ts:23`）で**記録**。
  manifest `migrationProvenanceRef` に attach。

## 2. 対象別 adapter

| 対象 | adapter | 変換先 | 備考 |
|------|---------|--------|------|
| old `project.json` | ProjectModel→BusinessProject adapter | Analysis doc（bridge-frame-analysis）+ProjectMetadata+road(空)/bridge(空) | FEM model は Analysis へ。liner/apollo sidecars は別途。 |
| Apollo workspace(localStorage) | workspace→AnalysisProject adapter | AnalysisProject（quick analysis）or BusinessProject.Analyses[] | 12 workspace スロット→12 analyses。後からBusinessProjectへ取り込み（P17） |
| BridgeProject canonical file | **identity（reuse）** | `bridges/<id>/{cbdm,manifest,superstructure,substructure}.json` | Protected Core そのまま。ID 再発行 or preserve。 |
| backend bridges `<id>.json` | BridgeDomain adapter | BridgeProject folder | `backend/app/main.py:1127-1222` CRUD 形式→canonical docs。 |
| substructure-project.json | substructure adapter | `bridges/<id>/substructure.json` | `SubstructurePlanningHost.tsx:304-366` envelope 解析。 |
| scattered artifacts | deliverable bundler | `deliverables/<id>/` | file pattern から sourceRefs を推定。 |

## 3. 安全機構

| 機構 | 実現 |
|------|------|
| destructive 禁止 | import = **new folder**。元ファイルは read-only。 |
| 前backup | import 前 `backend/data` や localStorage の snapshot copy。 |
| schemaVersion | manifest `schemaVersion` + `migrationRecordRef`。version mismatch → migration required 提示。 |
| dry-run / validation | checksum + reference resolve + schema validate。失敗時 import 中断。 |
| rollback | import フォルダを破棄（元データ無変更）。 |
| partial failure | 1 doc 失敗 → その doc skip + warn；他 doc は継続。manifest は成功 doc だけ reflect。 |
| ID collision | UUID remap table。reference rewriting。（P7） |

## 4. Migration record (canonical doc)

`.system/migration/` or `migrations/<recordId>.json`:
```jsonc
{
  "documentKind": "migration-record",
  "schemaId": "spacer.contracts.migration-record",
  "documentId": "<uuid>",
  "revisionId": 1,
  "contentChecksum": {...}, "provenance": {...},
  "source": { "kind": "legacy-project-json|apollo-workspace|backend-bridge", "ref": "...", "checksum": "..." },
  "targetBusinessProjectId": "<uuid>",
  "fieldMapping": { "ProjectModel.nodes -> analyses/<id>/document.json.nodes" },
  "losses": [ { "field": "...", "policy": "dropped|migrated|preserve" } ],
  "warnings": [ ... ],
  "status": "draft|verified|applied",
  "appliedAt": "..."
}
```
→ `contracts/migrationRecord.ts` を reuse / extend。

## 5. 実装フェーズ

1. Phase A: `migrate project.json → BusinessProject` (Analysis doc + metadata)。dry-run first。
2. Phase B: BridgeProject canonical reuse；artifact bundling。
3. Phase C: workspace/localStorage importer；backend bridge importer。
4. 各 phase は **extension proposal** として記録。今回実装しない。

## 6. コード根拠

- `contracts/migrationRecord.ts` (migration-record kind, validator)
- `contracts/contractVersionRegistry.ts` ENGINEERING_PROJECT_SCHEMA_VERSION（version gate）
- `contracts/engineeringProject.ts` `migrationProvenanceRef` field（既設 extension point）
- backend `AtomicJsonStore.create_only`（import create-only / collision detect）
