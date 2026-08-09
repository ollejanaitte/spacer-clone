# 08 History / Backup 設計（P11）

> git 型巨大履歴は不要。**revision log + snapshot** の軽量方式。

## 0. 方針

- full-object な履歴は作らない（diff ではなく checksum + changed refs）。
- `.system/history/` = append-only **revision log**。manifest は最新のみ。
- History/Backup は正本を保護する**副次的**機能。CANONICAL/RESULT は P6 参照。

## 1. History log（.system/history/）

ファイル: `.system/history/<revision>.json`（canonical, append-only）。

```jsonc
{
  "revisionId": 3,
  "businessProjectId": "<uuid>",
  "timestamp": "2026-08-09T...",
  "manifestChecksum": "<sha256>",
  "changedEntityRefs": [  // kind:id:revision
    "road-design:uuid-road:2",
    "bridge-project:uuid-bp:5"
  ],
  "backupPoint": true,        // snapshot 作成時 flag
  "migrationRecordRef": null,
  "actor": { "actorId": "...", "actorType": "user|tool" },
  "reason": "user save / autosave commit / import migration"
}
```

- `revisionId` は manifest.revisionId と 1:1。
- `changedEntityRefs` は差分検知（前回 checksum と child checksum 比較）で充填。
- 12 Case 参照: Case 3（Bridge 002 だけ更新）→ changedEntityRefs に bridge-project:002 のみ。

## 2. History 配置方式比較

| 方式 | メリット | デメリット | 判定 |
|------|----------|-----------|------|
| A. `.system/history/` append log | 軽量・audit trail・reconstruct 可能（Case 11） | full snapshot ではない（差分再生は手間） | **Prototype 採用** |
| B. manifest 内 `revisionLog[]` | 1ファイルで閉じる | manifest 肥大・canonical 再計算コスト↑ | V2候補 |
| C. git backend | 完全監査 | 1プロジェクト=git repo は過剰・Windows path問題 | 将来 extension |

→ A を採用。manifest は latest のみ保持。

## 3. Backup 方式

| 方式 | 内容 | 利便 | 実装 | 判定 |
|------|------|------|------|------|
| A. Project Folder copy | フォルダ丸ごとコピー | ○（同一PC） | `cp -r` / Electron フォルダコピー | **Prototype 推奨（最も確実）** |
| B. package エクスポート（zip） | P14 Package | ○（移動/送受信） | zip+checksum |  portable backup |
| C. snapshot（`.system/snapshots/<ts>.tar`) | 差分/全量スナップショット | ○（履歴ポイント） | tar+checksum | V2 (large project) |
| D. incremental backup | 差分のみ転送 | ○（bandwidth） | changed ref diff | V3 |

## 4. Backup ポリシー

- 手動 backup は **A（folder copy）** を推奨（Prototype）。実装最小。
- ポータブル backup は **B（package）**（P14）。
- `.system/` を含むか？ → **cache/除外, history/optional-include, autosave/recovery/除外**。
- backup 時は manifest checksum を verify（Case 11 catalog 再構築用）。
- Backup は **read-only** 構造（immutable package repository パターン `immutablePackageRepository.ts` 参考）。

## 5. History/Backup + Catalog 関係

- `.system/history/<rev>.json` は Catalog の `lastSavedAt/backupPoint` 来源。
- Catalog 消失 → manifest scan rebuild（Case 11）。history log は補助（reconstruct 用）。
