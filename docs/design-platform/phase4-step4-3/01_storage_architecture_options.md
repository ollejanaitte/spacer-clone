# 01 保存方式アーキテクチャ比較（P1）

> Phase 4 / Step 4-3（保存システム本体設計）— 案選択
> 入力: 006 保存経路棚卸し（コード根拠済）, Step 4-2 業務Project概念,
>   contracts/（EngineeringProject / RoadDesignDocument / DocumentReference / ImmutableResourceReference / RevisionedDocumentRepository / AtomicJsonStore）

## 0. 前提（コードから読み取った現実）

- 現行最上位状態は `frontend/src/types.ts:250-296` の `ProjectModel`（FEM 1モデル + liner/apollo sidecars）。
- 保存先は 5 系統に分散（project.json / localStorage / backend/data / substructure-project.json / ダウンロード成果物）。
- `BridgeProject` は既に**canonical JSON**（CBDM + manifest + superstructure + substructure）であり、
  `DocumentReference(kind:id:revision+checksum+uri)` と `CanonicalJsonForChecksum`（キー整列）と
  `validateBridgeProject`（fail-closed）による検証を持つ。（Protected Core）
- Backend `AtomicJsonStore`（`backend/app/atomic_json.py:207-238`）は
  **temp→flush→fsync→os.replace→dir fsync** のsingle-file atomic publish を実装。NaN/Infinity 拒否。
  `create_only`, `expected_checksum`（楽観的排他）をサポート。
- `frontend/src/contracts/engineeringProject.ts` にドキュメント種 `engineering-project` のマニフェスト
  コントラクトが存在するが、**アプリコードからの呼び出しはない**（未配線）。roadDesignRef / frameAnalysisRefs /
  transferRecordRefs を持つ ToC 型。
- `RevisionedDocumentRepository`（in-memory）は `documentId(UUID)+revisionId` +
  `expectedCurrentRevision` 楽観的排他を実装。ファイル上に持ち上げ可能。

## 1. 比較案

### 案A: 単一巨大 JSON（project.json 一本化）
- BusinessProject + Road + Bridge + Analysis + binary を1つの巨大 project.json へ埋め込む。

| 軸 | 評価 |
|----|------|
| 分かりやすさ | × 100MB 超 JSON は人間もツールも扱いにくい |
| 実装難易度 | △ 低い（現行 project.json 拡張） |
| 壊れにくさ | × 1ファイル=1障害点。巨大ほど破損リスク↑ |
| 部分破損復旧 | × 1キー1行で壊れると全業務失御 |
| 複数道路/橋/解析 | △ 配列で表現できるが巨大化 |
| 大容量Terrain | × バイナリをBase64 embed は容量33%↑・編集不能 |
| Save/Load | △ 全体読み書き |
| autosave | × 1巨大ファイルの高頻度再書込は I/O 爆発 |
| crash recovery | × |
| backup | △ ファイル1つで軽いが中身壊れ対脆弱 |
| package | △ 1ファイルが利便だが巨大 |
| migration | △ 1箇所だが粒度荒すぎる |
| portability | 1ファイル=簡単 |
| Windows/Linux | ○ |
| Protected Core 互換 | × BridgeProject canonical を埋める → 破壊的 |
| Workflow 互換 | × |
| 過剰設計リスク | △ 少ないが**原則違反**（巨大1JSON決め打ちは禁止） |

→ **却下**（禁止事項「巨大な1JSON決め打ち」に直接違反）

### 案B: Folder + 分割 JSON（pathベース参照）
- business-project.json + roads/*.json + bridges/*.json など、path で参照。

| 軸 | 評価 |
|----|------|
| 分かりやすさ | ○ フォルダツリー直感的 |
| 実装難易度 | ○ |
| 壊れにくさ | △ path参照は rename/move で dangling |
| 部分破損復旧 | ○ 1エンティティ1ファイル |
| 複数道路/橋/解析 | ○ |
| 大容量Terrain | △ path参照だがバイナリ埋込問題は解決しない |
| Save/Load | ○ |
| autosave | ○ |
| crash recovery | ○ |
| backup | ○ |
| package | ○ |
| portability | × path が identity になる（禁止事項「ファイルパスをidentityとする」違反） |
| Windows/Linux | ○ |
| Protected Core 互換 | △ BridgeProject canonical は維持できるが参照がpath→壊れやすい |
| migration | ○ |
| 過剰設計リスク | △ |

→ **改良必須**。path を identity にしない「manifest = TOC + StableID参照」へ昇華が必要。

### 案C: Folder + manifest + Entity canonical docs + resource 分離（推奨）
- BusinessProject フォルダ。`business-project.json` は**manifest/目次**（ToC）
  （`engineering-project` documentKind, canonical JSON, sha256 checksum）。
- 各 Entity は **canonical document**（envelope+body, DocumentReference 参照, checksum 付き）。
- バイナリ/Terrain/成果物は `resources/<sha256>.<ext>`（immutable, content-address）へ分離し、
  `ImmutableResourceReference(uri+checksum)` で参照。

| 軸 | 評価 |
|----|------|
| 分かりやしさ | ○ 直観的 + manifest がまとめて目次役 |
| 実装難易度 | ○△ 既存 contract（envelope/DocumentReference/RevisionedDocumentRepository/AtomicJsonStore）を再利用 |
| 壊れにくさ | ○ 各 doc 独立 atomic publish; manifest は最後に commit |
| 部分破損復旧 | ○ 1 doc 壊れても他復旧; manifest がない場合は子だくさんで再構築可 |
| 複数道路/橋/解析 | ○ roads/*, bridges/*, analyses/* 自然 |
| 大容量Terrain | ○ バイナリ分離（content-addressed） |
| Save/Load | ○ |
| autosave | ○ .system/autosave ステージング |
| crash recovery | ○ .system/recovery journal + 候補比較 |
| backup | ○ |
| package | ○ ZIP + manifest checksum。外部URIはインライン化 |
| portability | ○ ID は path に依存しない (StableID) |
| Windows/Linux | ○ ユーザー空間 atomic publish は portable（dir fsync は Windows で no-op 許容） |
| Protected Core 互換 | ○ BridgeProject はそのまま canonical doc として bridges/<id>/ に配置。Core 内部非変更 |
| Workflow 互換 | ○ manifest が workflow 用の status/revision/cycle を保持 |
| 過剰設計リスク | ○ |

→ **推奨**

## 2. 追加候補

### 案D: case C + Immutable Package Repository（transfer 用）
- case C に加え、受渡し用の immutable transfer package（`roadToFrameTransferPackage` /
  `transferRecord` コントラクト）を利用。package = zip + transfer-record manifest。
- 実装: case C と同一インフラ上に package レイヤーを重ねる。**案Cの上位互換**なので、
  案Cと統合して「package は manifest + 子docs + resources を zip 凝縮 + transfer-record 付与」で扱う。

## 3. 最終推奨

**案C（+Dのpackageレイヤー)** ：
- manifest = TOC（owner = BusinessProject）。BusinessProject = `engineering-project` document
  （既存コントラクトを**extend**）。
- Entity = canonical document（envelope + DocumentReference 参照 + ImmutableResourceReference）。
- binary = `resources/<sha256>.<ext>`（immutable）。
- persistence = file 上の `RevisionedDocumentRepository`（`AtomicJsonStore`再利用）。
- transaction = children-first atomic + manifest-last commit + recovery journal。

> 理由: 既存 canonical contract を最大限再利用しつつ「巨大1JSON」「path=identity」
> を両方避ける。Protected Core（BridgeProject canonical）をフォルダ配置のみで吸収。
> EngineeringProject は未配線なので extend は破壊的リスクなし。
