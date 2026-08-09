# 07 Stable ID / Reference / Path 規則（P7）

> 根拠: `contracts/documentReference.ts`（kind:id:revision+checksum+uri）、
> `contracts/stableEntityId.ts`（namespace+UUID+entityKind+aliases）、
> `contracts/revision.ts`（RevisionId positive int, parentRevisionIds, baseRevisionId）、
> `contracts/legacy/checksum.ts`（canonicalJsonForChecksum）、Step4-2 §4/§8。

## 1. ID 原則

| 原剧 | 内容 |
|------|------|
| ID は path ではない | identity = UUID + revision + checksum。path は location。rename/move で参照不壊。 |
| human-readable は primary key にしない | projectNumber/projectName/road名称は表示用。rename しても Stable ID 一定。 |
| Stable ID = UUID | businessProjectId/roadId/bridgeProjectId/analysisId/datasetId/deliverableId/resourceId は UUIDv4/v5。 |
| entityId（in-doc） = StableEntityId | namespace + UUID + entityKind + aliases。road-design doc 内の Alignment/Section/Bridge/Sectionを識別。 |

### Stable ID 一覧

| ID | kind | 生成 | 主体 |
|----|------|------|------|
| businessProjectId | DocumentReference(documentId) | UUID | BusinessProject(manifest) |
| roadId | DocumentReference(documentId) / StableEntityId.id | UUID | Road(road-design doc) |
| roadSectionId | StableEntityId.id | UUID or deterministic v5 | Road design doc 内 |
| alignmentId | StableEntityId.id（RoadAlignmentEntry.entityId） | UUID/deterministic | road-design doc 内 |
| bridgeProjectId | DocumentReference(documentId) | UUID | BridgeProject manifest |
| bridgeCBDMId / superstructureId / substructureId | DocumentReference(documentId) | UUID (manifest.deriveStableUuid) | BridgeProject 子 docs |
| analysisId | DocumentReference(documentId) | UUID | Analysis document |
| resultId | DocumentReference(documentId) | UUID | AnalysisResult / persisted-result |
| datasetId | DocumentReference(documentId) | UUID | TerrainDataset/ExistingCondition |
| deliverableId | DocumentReference(documentId) | UUID | Deliverable |
| resourceId / binary | sha256 hex | content hash | resources/<sha>.<ext> |
| coordinateRefId | DocumentReference(documentId) | UUID | CoordinateContext |

## 2. Reference 形式：kind + id + revision + checksum（採用）

```ts
interface DocumentReference {
  documentKind: DocumentKind;        // enum（road-design / bridge-project / engineering-project 他）
  documentId: UuidString;            // identity（rename しても一定）
  revisionId: RevisionId;            // positive int（floating latest 禁止）
  contentChecksum: ContentChecksum;  // sha256（dangling/盗換/detached検知）
  uri?: string;                      // project-root 相対 path（location）
  mediaType?: string;                // resources 用
}
```

- identity = `documentReferenceIdentity = "kind:uuid:revision"`（`documentReference.ts:28`）。
- **revision を参照に含める** → 参照先が更新された時に自動 **stale 検知**
  （Step4-2 §1 Case1「stale 検知」）。更新された参照を受け入れるにはユーザー確認。
- **checksum 付き** → 同一 revision でも内容盗換/detached を検知（Canonical integrity）。
- `uri` は**相対 path**（portability）。path 欠落時は contentChecksum で project 内検索。

## 3. 子 doc → BusinessProject manifest の逆参照

- 各 child doc は envelope（documentId/revisionId/contentChecksum）を持つ。
- BusinessProject manifest は各 child の `DocumentReference` を `*Refs[]` で列挙。
- **双方向整合**: manifest が参照する child の checksum/revision は、
  child ファイルの実体 checksum/revision と一致する。Load 時検証（fail-closed）。

## 4. copy / import / delete の ID ルール（Step4-2 §2/§3 継承）

| 操作 | ルール |
|------|--------|
| copy BusinessProject | 全 Entity の documentId を**再発行**（UUID new），internal ref を張り直し。SharedDataset は共有 or 複製選択。 |
| copy Bridge 002 | alignmentRef/terrainRef は**同参照を継承** or 明示的新参照。analysisId は再発行。 |
| import Project | ID 衝突検知（`AtomicJsonStore.createOnly` 相当，UUID 衝突→remap or エラー）。外部 UUID を remap 可能。 |
| delete Road Section | 参照中 Bridge があれば **fail-closed**（削除不可）or 参照解除確認。 |
| delete Bridge | Analysis/Deriverable が参照中なら dependency check → fail-closed。 |
| dangling reference | Load 時検知 → **fail-closed**（project は開かない OR 該当 entity 孤立+警告）。黙っ切り離さない。 |

## 5. path と identity の分離（P7 判断）

- file path = `<dir>/<documentId>.<kind-alias>.json`（human-readable alias；identity ではない）。
- manifest `uri` = project-root からの相対 path。
- 移動/リネーム: manifest `uri` を更新し、documentId/revision/checksum は不変。
  → 「path は location，ID は identity」を物理的に強制。

## 6. コード再利用

- ID 生成: `contracts/uuid.ts`（`generateUuid`/`isValidUuid`）。
- stableUUID: `contracts/legacy/idStability.ts` の `deriveStableUuid`（bridge manifest 用）。
- Reference 検証: `validateDocumentReference` / `validateDocumentReferenceCollection`（duplicate kind:id:rev 検知）。
- revision: `isPositiveRevisionId`（floating latest を拒否）。
