# 03 business-project.json manifest 設計（P3）

> manifest = BusinessProject の ToC/目次。**全データ JSON ではない**。
> 子 Entity の identity（Stable ID）・location（path）・content checksum・revision を列挙する。
> 技術的には既存 `engineering-project` documentKind のコントラクトを **extend** する。

## 0. ドキュメント種別決定

| 名称 | documentKind | 実装場所 | 備考 |
|------|--------------|----------|------|
| BusinessProject manifest | `engineering-project` | `frontend/src/contracts/engineeringProject.ts` | **既存**（未配線）。BusinessProject = EngineeringProject（業務名。ドキュメント種は `engineering-project` を**再利用**） |

> 命名: ユーザー向けは「BusinessProject/業務」。技術的 documentKind は既存の
> `engineering-project` をそのまま再利用する（新規 kind 追加は**避ける**）。
> Step 4-2 P5「manifest は参照だけ持つ」+「human-readable は primary key にしない」に一致。

## 1. manifest の所有情報 vs 子 doc の所有情報

| 情報 | 所有者 | 理由 |
|------|--------|------|
| schemaId / schemaVersion / documentId / documentKind / revisionId / contentChecksum / provenance | manifest | envelope（canonical） |
| businessProjectId / projectNumber / projectName / designStage / coordinateReference | manifest | 業務メタデータ（ToC） |
| createdAt / updatedAt / revision | manifest | BusinessProject ライフサイクル |
| projectStatus / phase | manifest | ToC からの統括ステータス導出用 |
| 子 Entity の参照一覧（roadRefs/ bridgeProjectRefs/ analysisRefs/ sharedDatasetRefs/ deliverableRefs） | manifest | **ToC**。実体は子 doc へ |
| 子 Entity の実体・設計値 | 子 doc | 巨積回避・Protected Core分離 |
| attachments / source documents | manifest or Attachment doc | 小規模は manifest 参照、大きいは `attachments` ドキュメント |
| runtime-only state（dirty, viewport, UI選択） | **manifest 外**（.system/autosave or memory） | 保存対象外。manifest は正本。 |

## 2. manifest JSON スキーマ（proposed extension of EngineeringProject）

```jsonc
{
  // ---- envelope（canonical JSON, sorted keys; checksum は本体から除外して算出） ----
  "schemaId": "spacer.contracts.engineering-project",
  "schemaVersion": "0.2.0",            // ← 0.1.0 から extend（additive）
  "documentKind": "engineering-project",
  "documentId": "<businessProjectId UUID>",
  "revisionId": 1,                     // formal save ごとに +1
  "contentChecksum": { "algorithm": "sha256", "hexDigest": "<body sha256>" },
  "provenance": { ... },              // createdAt/createdBy/producer

  // ---- BusinessProject メタデータ ----
  "projectId": "<businessProjectId UUID>",            // = documentId（工程Projectと同じく）
  "projectNumber": "H620164A",                         // 表示用。rename 普通。NOT primary key
  "projectName": "○○道路設計業務",
  "designStage": "road_design",                        // enum: road_design | superstructure | substructure | analysis | complete
  "projectStatus": "active",                           // enum: active | sealed | archived | draft
  "coordinateReference": { "kind": "coordinate-context", "documentId": "<coordContext UUID>", "revisionId": 1, ... } | null,

  // ---- 子 Entity 参照（ToC） ----
  // kind は DocumentKind 列挙に準拠。revisionId は正の整数（floating latest 禁止）。
  "roadRefs": [
    { "documentKind": "road-design", "documentId": "<roadId UUID>", "revisionId": 1,
      "contentChecksum": { "algorithm": "sha256", "hexDigest": "<sha>" },
      "uri": "roads/<roadId>.road.json", "entityId": "<road stable entity id>" }
  ],
  "bridgeProjectRefs": [
    { "documentKind": "bridge-project", "documentId": "<bridgeId UUID>", "revisionId": 1,
      "contentChecksum": { "algorithm": "sha256", "hexDigest": "<sha>" },
      "uri": "bridges/<bridgeId>/manifest.json" }
  ],
  "analysisRefs": [
    { "documentKind": "bridge-frame-analysis", "documentId": "<analysisId UUID>", "revisionId": 1,
      "contentChecksum": { "algorithm": "sha256", "hexDigest": "<sha>" },
      "uri": "analyses/<analysisId>/document.json" }
  ],
  "sharedDatasetRefs": [
    { "documentKind": "terrain-dataset", | "existing-condition-dataset", ... id/revision/checksum/uri }
  ],
  "deliverableRefs": [
    { "documentKind": "persisted-result", "documentId": "<deliverableId UUID>", "revisionId": 1, ... }
  ],
  "attachmentRefs": [ { ... documentReference | ImmutableResourceReference ... } ],

  // ---- revision/lifecycle ----
  "projectRevisionMetadata": { ... RevisionMetadata ... },  // documentId/revisionId/checksum 整合
  "status": { "phase": "...", "sections": { "road": "COMPLETE", "bridge": "PARTIAL", ... } },

  // ---- migration / provenance ----
  "migrationProvenanceRef": { "documentKind": "migration-record", ... } | null,
  "extensions": { ... },               // additive future fields
  "unknownFieldStoreRef": ... | null   // 溢れたフィールド用ストア
}
```

### 2.1 manifest に入れない（分離する）

- **編集中の子 doc 中身** — 子 doc へ。manifest は ToC。
- **viewer cache / thumbnail / preview** — `.system/cache/`（regenerable）。
- **runtime dirty state / viewport** — memory or `.system/autosave/`。
- **autosave 版** — `.system/autosave/`（formal manifest revision を bump しない）。
- **履歴 log 本体** — `.system/history/` の append-only log。manifest は最新のみ。
- **巨大 binary（Terrain/PDF/STL）** — `resources/<sha256>.<ext>` + `ImmutableResourceReference`。

## 3. 整合性ルール（manifest レベル）

1. `projectId`/`documentId` == `projectRevisionMetadata.documentId` == businessProjectId。
2. `revisionId` == `projectRevisionMetadata.revisionId`（整合）。
3. `contentChecksum` == canonical-serialize(manifest excluding contentChecksum) の sha256。
4. すべての `*Refs[]` の `documentKind` は許容種別；`documentId` は UUID；`revisionId` は正整数；
   `contentChecksum` は子 doc の実体と一致（dangling/盗換検知）。
5. 参照先の `uri` は project root からの**相対 path**（portability）。
6. `FORBIDDEN_EMBEDDED_PAYLOAD_KEYS`（既存 `engineeringProject.ts:55-71`）を継承：
   `model/structuralModel/alignments/nodes/members/loadCases/solverResults/...` を manifest に埋め込まない。

## 4. serialization

- `canonicalJsonForChecksum`（`frontend/src/contracts/legacy/checksum.ts:15`）を再利用：
  キー sort + NaN/Infinity 拒否 → **deterministic**。現行 project.json（`JSON.stringify(..,2)`）は非決定的なので、
  manifest は canonical にする（checksum 安定 + BridgeProject に準ずる）。
- checksum は `checksumHex` パターン（body から contentChecksum を除外して算出）を踏襲。

## 5. 変更履歴（schemaVersion 運用）

- `0.1.0`: EngineeringProject 原型（roadDesignRef 単数 / frameAnalysisRefs / transferRecordRefs）。
- `0.2.0`（proposed in Step 4-3）: roadRefs[] / bridgeProjectRefs[] / analysisRefs[] /
  sharedDatasetRefs[] / deliverableRefs[] / coordinateReference / projectStatus を**additive**追加。
  → 既存 0.1.0 ドキュメントは `migration` で 0.2.0 へ。**破壊的変更はしない**。
