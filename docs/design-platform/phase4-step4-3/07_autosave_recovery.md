# 07 Autosave / Recovery 設計（P10）

> 原則: **正式Save ≠ Autosave**。Autosave は正本 manifest を直接壊さない
> （現行 `AUTOSAVE_ENABLED=false` を再設計で再有効化判断）。

## 0. 現行状況（コード確認）

- `App.tsx:135` `AUTOSAVE_ENABLED = false` で autosave/write/recovery が**無効**。
- デバウンプロジック: `App.tsx:331-341` dirty 時 3000ms 後 `apiClient.autosaveProject(project)`
  → `POST /api/projects/autosave`（`App.tsx:336`, `client.ts:256`）。
- 起動時リカバリ候補: `App.tsx:299-310` `loadAutosaveCandidate`（`GET /api/projects/autosave`）。
- backend: `autosave.json`（`main.py:48,437`）、AtomicJsonStore で atomic。
- → autosave 対象は正式 project.json 保存とは**分離**。

## 1. 構造

```
.system/
├─ autosave/                  ← autosave candidate（manifest + dirty child docs）
│   ├─ business-project.json  （autosave revision 付き；formal manifest revision とは独立）
│   ├─ <child-id>.<kind>.json
│   └─ autosave.meta.json     ← {projectRootChecksum, autosaveRevision, updatedAt, dirtyEntityRefs, formalRevisionAtAutosave}
└─ recovery/
    └─ transaction.json       ← crash intent journal（P9 step5+P10 crash detection）
```

## 2. autosave 対象 / 非対象

| 対象 | autosave | 理由 |
|------|----------|------|
| BusinessProject manifest | ○ | ToC は変わりやすい |
| 編集中の child doc（Road/Analysis/...） | ○（dirty のみ） | 変更検知で局所保存 |
| BridgeProject canonical docs | △（subsystemで） | Protected Core は atomic 4文書セットで。編集中バッファは別途。 |
| shared datasets / resources | ×（immutable） | 変化しない；参照は manifest で追跡 |
| deliverables artifact bytes | × | regenerable；doc はautosave対象 |
| viewer cache | × | regenerable |
| .system/history | × | append-only formal save only |

## 3. タイミング・挙動

- **debounce**: dirty から**5s idle**（現行3sを5sに延長; 3D再生成抑制）または
  **20件/100ファイル 変更**で autosave kick。
- **dirty state**: 各 child doc に contentChecksum を計算し manifest との差で dirty 検出
  （formal manifest checksum と比較）。rename を dirty にしない（ID は path 依存しない）。
- **autosave revision**: `.system/autosave/autosave.meta.json.autosaveRevision` を +1。
  formal `manifest.revisionId` は**触らない**（autosave で正本 revision が上がると迷惑）。
- **世代数**: `.system/autosave/*` を**3世代**keep（`autosave.meta.json` + timestamp 付き）。
  世代超過で oldest を rotate。（Disk 肥満防止）
- **collision**: autosave は staging dir（`.system/autosave/`）で atomic replace。
  formal save と同時実行 → `expected_checksum`（formal manifest checksum）で排他。

## 4. crash detection / recovery

- **crash detection**: 起動時 `.system/recovery/transaction.json` の commit marker を確認。
  marker 未立 → crash と判定。
- **candidate 比較**: formal manifest vs `.system/autosave/business-project.json` vs recovery journal。
  - revision / updatedAt / dirtyEntityRefs を比較 → **newest valid** を候補。
  - formal >= autosave なら autosave 候補を discard 提示（or 自動捨去）。
- **corrupted autosave 検知**: read 時 `contentChecksum verify` + JSON parse。壊れていれば
  **discard + warn**（正本を上書きしない）。→ 禁止事項「Autosaveで正本を直接壊す」回避。
- **recovery flow**:
  1. journal が commit pending → orphan child 回収（formal manifest が指す revision に
     戻して開く，またはユーザー選択）。
  2. autosave candidate present → ダイアログ「autosave があります。復元しますか」。
  3. recovery 後の **formal Save**: ユーザーが [保存]押下で autosave 版を正本として commit
     （manifest revision +1）。

## 5. 正式保存との競合

- formal Save 中に autosave が fire しない（formal save 完了まで autosave を pause，または
  formal save が manifest expected_checksum で排他）。
- formal Save 後に `.system/autosave/*`, `.system/recovery/transaction.json` を**クリア**。
- autosave は **formal 保存のバックアップ**ではない。long-term backup は P11 history/snapshot。

## 6. cleanup

- formal Save 成功後 → autosave ストではなく `.system/history` へ revision log。autosave は
  次回 dirty 書込みで上書き（世代3）。
- recovery journal は commit 後 **delete**。stale (>1回再生)なら強制削除。
