# 12 Project Catalog 設計（P15）

> Design Platform Home / 業務一覧 / 最近使用 に必要。
> manifest = 正本。Catalog = 検索/表示用 index **（reconstructable）**。
> DB は決め打ちしない。

## 0. 役割分担

| | BusinessProject manifest (`business-project.json`) | Project Catalog |
|---|---|---|
| 役割 | 正本（source of truth）。businessProjectId / refs / checksum / revision | 検索・表示・ソート用 index |
| 所在 | 各 Project folder root | **workspace ルート** 1 ファイル or DB |
| 消失影響 | project 死亡 | **reconstructable**（folder scan） |
| 書込み | Save 時 atomic | open/use 時 incremental 更新 |

## 1. Catalog エントリ

`~/.design-platform/catalog.json`（user workspace）または
`<workspace>/projects.catalog.json`:

```jsonc
{
  "catalogVersion": "0.1.0",
  "updatedAt": "...",
  "projects": [
    {
      "businessProjectId": "<uuid>",
      "projectNumber": "H620164A",
      "projectName": "○×道路設計業務",
      "designStage": "road_design",
      "status": "active",
      "path": "/home/masaharu/Projects/design/H620164A_○×道路設計業務",   // absolute or relative
      "lastSavedAt": "...",
      "lastOpenedAt": "...",
      "openedCount": 42,
      "manifestChecksum": "<sha256>",          // manifest 変化検知
      "topLevelEntityCount": 3,                // roads+bridges+analyses 概数
      "schemaVersion": "0.2.0",
      "compatible": true                       // app version compatibility
    }
  ]
}
```

- path は**検索表示用 location**（identity ではない）。移動時は path 更新。
- `manifestChecksum` で manifest 外部変更検知（他PCコピー後 1回目 open 時 update）。

## 2. 再構築（Case 11）

- Catalog file が**missing/corrupt** → `scanWorkspace(root)`:
  - folder を走査 → `business-project.json` を発見 →
    `parseBridgeProjectManifest`-like で parse + `contentChecksum verify` → rebuild entry。
  - broken manifest → skip + warn（catalog 壊れさせない）。
- catalog は**cache**（P6 C）扱い。`.system/cache`-相当（non-canonical, regenerable）。

## 3. 実装方式

| 方式 | 利点 | 欠点 | 判定 |
|------|------|------|------|
| A. JSON index file | portable, git-friendly | 同時更新 conflict | **Prototype 推奨** |
| B. SQLite | query/index | binary, lock, over-engineering | V2 (多プロジェクト時) |
| C. OS shell index | fastest | platform依存 | reject |

→ **A**（JSON file）。同時更新 conflict は `expected_checksum`（manifest 変更検知）で対処；
file-lock は避ける（read-after-write verify）。

## 4. 運用

- open Project → catalog entry `lastOpenedAt` + `openedCount` 更新（atomic replace).
- save Project → catalog `lastSavedAt` + `manifestChecksum` 更新。
- move/delete Project → catalog からエントリ除去（or 参照切れを scan 時 skip).
- 外部（他PC folder copy）: 1 回目 open 時 `scanWorkspace` で**未登録 project を自動検出**。
  → Case 7/8.
