# 11 Package / Import-Export 設計（P14）

> 通常: 1 BusinessProject = 1 folder (Case 7)。
> 受渡し: 1-file package（ZIP）（Case 8）。
> 根拠: `contracts/repository/immutablePackageRepository.ts`（immutable transfer package pattern）、
> `contracts/roadToFrameTransferPackage.ts` / `transferRecord.ts`（existing package+record kinds）。

## 0. package 定義

- **package** = BusinessProject folder の portable 凝縮（zip）。
- extension: `.business-project` または `.dpz`（design-platform zip）。
- **package manifest**: `package-manifest.json`（zip 内 root）
  ```jsonc
  {
    "documentKind": "business-project-package",
    "schemaVersion": "0.1.0",
    "businessProjectId": "<uuid>",
    "baseRevisionId": <n>,
    "contentChecksum": "<sha256 over entries>",
    "entries": [ { "path": "roads/xxx.road.json", "sha256": "...", "size": ..., "classification": "CANONICAL" } ],
    "excluded": [ { "path": ".system/cache/...", "reason": "regenerable cache" } ],
    "externalResourceRefs": [ ... ],
    "createdAt": "...", "createdBy": { "toolId": "design-platform" }
  }
  ```
- package 本体 = canonical docs (A) + results (B) + resources + deliverables + history(optional)。
  `.system/autosave, recovery, cache` は **excluded**（regenerable/runtime-only）

## 1. export フロー

1. `build PackageManifest`: scan project tree → entries(path+sha256+size+classification)。
2. A CANONICAL + B RESULT **include**；C CACHE **exclude**。
3. external linked resource（P12 absolute/external uri）を `resources/<sha>` へコピー＆
   リライト to relative；残せないものは `externalResourceRefs` に warn。
4. zip（STORE or deflate；binary は deflate）。`artifactBundle.ts:287` は STORE reuse 可。
5. zip 内先頭に `package-manifest.json` 配置＆ checksum sign。

## 2. import フロー

1. zip open → `package-manifest.json` verify（all entries sha256；tamper detect）。
2. **path traversal / symlink 対策**: norm path し `..` / `/` / `\0` / symlink を **reject**。（zip-slip guard）
3. **ID collision**: 各 doc `documentId`(UUID) check。衝突 → **remap**(re-id) or エラー halt。
   references は remap テーブルで張り直し（P7）
4. external uri を project-root 相対にリライト。missing resource warn（Case 6）。
5. manifest `businessProjectId`/revision を新規発行 or preserve（選択）。
6. **dry-run/validation**: checksum verify + reference resolve + schema validate。
   失敗時 rollback（import先破棄）；**元を絶対破壊しない**（P16 migration 原理と同一）

## 3. 比較軸

| 軸 | package(ZIP) | folder copy |
|----|-------------|-------------|
| portability | ○（single file） | △（folder は扱い難い） |
| large resources | ○（zip streaming） | ○（copy） |
| checksum/tamper | ○（manifest sha256） | △（copy 時 verify 必要） |
| ID collision | ○（remap 可能） | △（rename で衝突） |
| malicious/path-traversal | guard 必須（zip-slip） | なし |

## 4. 現実装との接続

- `artifactBundle.ts:287` `apollo-development-deliverables_*.zip` → BusinessProject package 化へ
  リプレース/拡張（EXTENSION_PROPOSAL）。現行は apollo-scoped；Step4-3 で BusinessProject 全体に。
- 現行 apollo workspace localStorage snapshot も package 1つに束め直す対象（P16 migration）。
