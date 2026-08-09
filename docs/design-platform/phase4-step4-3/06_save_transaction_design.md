# 08 正式 Save 設計（P8）

> [保存] 押下時のフロー。manifest = ToC を最後に commit。各ファイル atomic publish
> （backend `AtomicJsonStore` / frontend Electron equivalent）。checksum readback verify。

## 0. 前提

- BusinessProject = folder。manifest = `business-project.json`（canonical, engineering-project doc）。
- child = canonical document（envelope + sha256 checksum）。
- platform: native fs が必要（Electron main / backend）。browser は in-memory + download 限定。

## 1. Save フロー

```
[ユーザー] Save
   ↓
1. dirty フラグ確認 + hasInvalidNumericDrafts gate（NOT_AUTHORIZED fail-closed 継承）
   ↓
2. schema validation
     - 各 child doc を zod/validate* で検証（canonical envelope / RoadDesign / BridgeProject / Analysis）
     - NaN/Infinity 拒否（`find_non_finite` / `canonicalJsonForChecksum` と同等）
   ↓
3. reference validation
     - manifest が指す *Refs[] の documentKind/id/revision/checksum を
       `validateDocumentReferenceCollection` で検証
     - dangling（referenced file がない）/checksum mismatch/mismatched revision → fail
   ↓
4. dependency validation
     - 削除対象 Entity に incoming reference があるか `collectIncomingRefs`（Step4-2 §2 Case3/4）
       → fail-closed
   ↓
5. write plan 生成
     - dirty child doc を canonical JSON 化 → body bytes + sha256
     - manifest body 更新（子 refs checksum/revision 更新 / revisionId +1）
     - manifest contentChecksum = canonical-serialize(manifest except checksum) → sha256
     - 全 write を `WritePlan{files:[{path,bytes,checksum,createOnly,expectedChecksum}]}` 化
   ↓
6. temporary write (staging)
     - 各 file を `AtomicJsonStore` 方式: temp→flush→fsync→os.replace→dir fsync
       （backend `atomic_json.py:164-191` 再利用；frontend は Electron main の
       fsync+rename equivalent）
     - child doc は**既存 revision を create_only で新規作成**し、manifest が指す
       revision/checksum を更新してから**最後**に manifest を commit する
   ↓
7. manifest revision 更新 + commit
     - manifest を atomic publish（expected_checksum = old manifest checksum, つまり
       optimistic concurrency）
   ↓
8. checksum 更新 / readback verify
     - publish 直後各 file の `checksum_for_path` を再算 → manifest checksum と一致検証
     - 不一致 → fail-closed, rollback journal で復旧
   ↓
9. 保存完了 → .system/history/ へ revision log append → dirty=false
```

## 2. 重要な不変式

- **manifest は最後に commit**。child 先に atomic で書いても manifest が指す revision は
  古いままなら、crash 後も project は**旧 manifest**（整合）で開ける。orphan child は
  `.system/recovery` journal で回収。（Case 4 対策）
- **正本を直接壊さない**: formal save は staging→atomic replace。autosave は正本に触れない
  (`.system/autosave/`）。
- **create_only / expected_checksum**: ID 衝突検知（import）と楽観的排他（revision）を
  AtomicJsonStore の既存パラメータで実現。

## 3. 現行コードの再利用

| Step | 現行実装 | 再利用 |
|------|----------|--------|
| atomic publish | `backend/app/atomic_json.py:164 atomic_publish_bytes`（temp→fsync→replace→dir fsync） | そのまま reuse |
| NaN/Infinity 拒否 | `main.py find_non_finite` | 再利用 |
| canonical JSON | `frontend/src/contracts/legacy/checksum.ts:15 canonicalJsonForChecksum` | 再利用 |
| content checksum | `computeSha256Hex` / `checksumHex`（cbdmDocument.ts:54） | 再利用 |
| reference validation | `validateDocumentReferenceCollection` | 再利用 |
| revision | `isPositiveRevisionId` / `RevisionMetadata` | 再利用 |

> 現行 `App.tsx:719-774` の project.json save は `JSON.stringify(..,2)`（非決定的）。
> BusinessProject manifest は **canonical** にする（checksum 安定・Protected Core 一致）。

## 4. 複数ファイル transaction 方式比較（P9）

BusinessProject は複数 file を原子的に更新しなければならない。比較:

| 方式 | 機序 | 実装難易度 | Windows | crash耐性 | large resource | 部分更新 | recovery容易性 |
|------|------|-----------|---------|-----------|----------------|----------|----------------|
| **A. children-first + manifest-last commit** | child を atomic 書込 → manifest を最後 atomic commit | 低 | ○ | ○（manifest 未commitなら旧状態） | ○ | ○ | ○（orphan child 回収） |
| B. staging dir + folder swap | staging に全体ビルド → mv で project ルート丸替 | 中 | ×（ディレクトリ rename は空の時しか失敗；cross-volume/USB で壊れやすい） | △（swap 途中は旧または新） | △（巨大を staging にコピー) | × | △ |
| C. journal / transaction manifest | intent(log+json)+checksums → 順次書込 → commit marker | 高 | ○ | ○（journal リプレイ） | ○ | ○ | ○（journal replay） |
| （反例）D. manifest-first | manifest 先 → child 順 | — | — | ×（manifest が指す child 未来存在） | — | — | ×（dangling） |

- **B** は Windows で `os.replace` が空ディレクトリにしか効かず、USB/network では cross-device で失敗→**非 portable**。
- **C** は最も堅いが、journal リプレイと衝突解決が複雑（V2 候補）。
- **A** は各ファイル atomic (AtomicJsonStore) ＋ manifest-last で**論理的アトミック性**を得る。
  crash 後: manifest は旧 revision を指すまま整合→ project は旧状態で開ける。
  新しい child は orphan だが `.system/recovery` journal があれば「commit pending」を検知し
  recovery candidate として提示（P10）。

## 5. Prototype 採用方式

**A + Cの軽量 journal**（Prototype Phase A/B）:
- child doc を `create_only` 新規（revision=latest+1）atomic publish。
- manifest を `expected_checksum=old` で atomic publish（楽観的排他）。
- `.system/recovery/transaction.json` に **intent log**（target files + checksums + old_manifest_checksum）を
  手順5（write plan 生成）時に atomic publishし、手順8成功後に **commit marker** を残し、
  次回 startup で commit marker 未立 → journal をもとに orphan child 回収＆選択復旧。
- → P10 autosave/recovery と統一の journal 基盤。

これにより P8（formal Save）と P9（multi-file transaction）が同一基盤で実現される。

