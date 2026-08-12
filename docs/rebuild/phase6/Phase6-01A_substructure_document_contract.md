# Phase 6-01 Step A: SubstructureDocument Contract（凍結案）

## 1. 目的

Phase 6（下部工）の下部工唯一正本 **SubstructureDocument** を完全設計する。
既存SubstructureProject v0.2.0（model.ts）をベース資産として利用しつつ、
新PDCのID/reference境界・derived transient規約に適合させる。

- baseline: `ab30a28bd36177c4f20c673bf2b426bf4280f639`
- 日付: 2026-08-13

## 2. 基本仕様

| 項目 | 値 |
|---|---|
| schemaId | `spacer.next.substructure-design-document` |
| schemaVersion | `0.1.0`（SEMVER） |
| documentKind | `substructure-design` |
| 格納場所 | `modules.substructure.data.substructureDocument` |
| 上位正本 | Project |
| 入力正本 | BridgeLayoutDocument（Support Handoff）・SuperstructureDocument（Bearing/Reaction Handoff） |
| 既存model.ts（v0.2.0）との関係 | **型を複製せず**、`Support`/`PierData`/`AbutmentData`/`Footing`/`PileGroup`/`BearingSeat`の構造を**canonical入力型としてADAPT**する |

### 2.1 旧SubstructureProjectとの関係

- 旧`SubstructureProject`（v0.2.0）は旧システム（/proアプリ）用。新正本にはしない
- 旧`serializeSubstructureProject`出力は**参照**（canonical型の参考・データ移行はPhase 6-02でアダプタ経由）
- 旧schemas（0.1.0）はPhase 6-01C（Schema Refresh）で0.2.0相当へ刷新

## 3. 全体構造

```ts
interface SubstructureDocument {
  schemaVersion: string;          // "0.1.0"
  documentKind: "substructure-design";
  documentId: string;             // uuid・安定ID
  projectId: string;              // uuid
  revisionId: number;             // >= 1
  status: SubstructureStatus;     // DRAFT|VALIDATED|APPROVED|STALE|ARCHIVED
  provenance: Provenance;         // createdAt/createdBy/producer
  timestamps: Timestamps;         // updatedAt/derivedAt
  bridgeLayoutReference: BridgeLayoutReference;     // reference
  superstructureReference: SuperstructureReference; // reference
  roadReference: RoadReference;                     // reference
  supportReferences: SupportReferences;             // derived（Phase 4 Support Handoff）
  bearingReactionReferences: BearingReactionReferences; // derived（Phase 5 Handoff）
  supports: Support[];            // canonical（model.ts ADAPT）
  bearingSeatReferences: BearingSeatReference[];    // derived（Phase 5 bearingSeats）
  footingConfigurations: FootingConfiguration[];    // canonical（model.ts Footing ADAPT）
  foundationConfigurations: FoundationConfiguration[]; // canonical
  pileConfigurations: PileConfiguration[];          // canonical（model.ts PileGroup ADAPT）
  terrainReferences: TerrainReferences;             // reference
  existingReferences: ExistingReferences;           // reference
  geometryReference: GeometryReference | null;      // derived（fingerprint）
  designInputs: DesignInputs;                        // canonical（設計入力）
  designResults: DesignResults;                      // derived（runDesign出力）
  quantityResults: QuantityResults;                  // derived（geometricQuantity）
  validation: ValidationState;                       // derived（直近検証結果）
  extensions: Record<string, unknown>;
}
```

## 4. 項目別詳細（owner / canonical / required / ID / version / validation / fail-closed / persistence / regeneration）

凡例: **kind**: C=canonical / R=reference / D=derived / T=transient
**owner**: SUB=下部工 / BL=Bridge Layout / SUP=Superstructure / ROAD / TERRAIN / EXT / PDC

### 4.1 schemaVersion — C / PDC / 必須
- const `"0.1.0"`・SEMVER一致・不一致はparse/write reject（fail-closed）・永続化

### 4.2 documentKind — C / const `"substructure-design"`・不一致reject

### 4.3 documentId — C / SUB
- ID規則: `deriveStableUuid("substructure-design", bridgeId)`（決定論的・安定）
- uuid形式・bridgeId不変なら同一ID

### 4.4 projectId — R / PDC / 必須・uuid・Project存在確認

### 4.5 revisionId — C / SUB / integer>=1
- canonical変更（support編集等）で+1・derived再生成では+0（derivedAt更新のみ）

### 4.6 status — C / SUB
- enum: `DRAFT|VALIDATED|APPROVED|STALE|ARCHIVED`
- DRAFT→VALIDATED（validation.ok）→STALE（入力正本変更検出）→APPROVED（Completion Gate）

### 4.7 provenance / timestamps — C / SUB
- provenance: createdAt/createdBy/producer（`spacer-substructure-module`）
- timestamps: updatedAt（canonical変更）/ derivedAt（derived再生成）

### 4.8 bridgeLayoutReference — R / BL
- `{ bridgeId, moduleId:"bridgeLayout", documentVersion, layoutFingerprint }`
- 必須・layout変更検出（STALE化）・ID参照のみ

### 4.9 superstructureReference — R / SUP
- `{ bridgeId, moduleId:"superstructure", documentVersion, superstructureDocumentId, handoffSchemaVersion }`
- 必須・Phase 5 Handoffの参照元

### 4.10 roadReference — R / ROAD / 必須
- `{ moduleId:"road", alignmentId, stationReferenceId, coordinatePolicyId }`

### 4.11 supportReferences — D / BL（生成元: buildSupportHandoff）
- 実体: `{ handoffId, schemaVersion, generatedAt, supports: SupportHandoffItem[] }`
  - SupportHandoffItem: `{ supportId, supportType, label, station, position{domainX,domainY,elevation}, tangentAzimuthRad, skewAngleRad, skewSource, terrainElevation, roadReferenceId, coordinateContextId }`
- **永続化DTOではtransient**（restore時にBridge Layoutから再生成・derived一致検証）
- fail-closed: Handoff ok=falseならderived更新不可

### 4.12 bearingReactionReferences — D / SUP（生成元: buildSuperstructureHandoff）
- 実体: `{ handoffId, schemaVersion, generatedAt, bearingSeats, reactionCases, girderBottomElevation: Record<supportId, number|null>, deckElevation: Record<supportId, number|null>, superstructureEnvelope, selfWeight, reactionStatus, authorizationStatus }`
  - **標高は `Record<supportId, number|null>`**（support単位に解決する変換を明記）
  - `authorizationStatus` はSuperstructureDocumentのreactionStatusから**明示転送**する（v1 Handoffに存在しない場合は`NOT_AUTHORIZED`を既定）
- **transient**（restore時にSuperstructureDocumentから再生成）
- 未認証Reaction（NOT_AUTHORIZED）は**入力データとして保持**（正式設計計算へ自動採用しない）

### 4.13 supports — C / SUB / 必須（>=1）
- 実体: 既存`model.ts Support`をADAPT（canonical入力）
  - `supportId`（A1/P1..Pn/A2・Bridge Layoutと一致必須）
  - `supportType`（"abutment"|"pier"）
  - `placement`（source: "liner"|"direct_xyz"・station/offset/alignmentId or position/azimuthRad）
  - `skewRad`（counterclockwise-positive）
  - `zOverride?`（縦断優先・override可）
  - `placementSnapshot?`（LINER算出値・読取専用・derived）
  - `bearingSeats`（BearingSeat[]）
  - `pier?` / `abutment?`（形状・canonical）
- validation: supportId一意・station finite・skew finite・shape必須（pier/abutment）
- fail-closed: 重複・dangling・shape欠落 reject
- persistence: **保存（canonical）**
- regeneration: 不可（ユーザー入力）※placementSnapshotは再生成可

### 4.14 bearingSeatReferences — D / SUP
- Phase 5 bearingSeats由来（seatId/supportId/girderId/position/orientation/bearingType等）
- transient・6課題解決後のmappingで受領

### 4.15 footingConfigurations — C / SUB
- 実体: 既存`Footing` ADAPT: `{ id, length, width, thickness, topElevation }`
- 寸法はcanonical入力（min: >0・topElevation finite）
- persistence: 保存

### 4.16 foundationConfigurations — C / SUB
- `{ id, formType: "spread"|"piled", footingRefId, pileGroupRefId|null }`
- persistence: 保存

### 4.17 pileConfigurations — C / SUB
- 実体: 既存`PileGroup` ADAPT: `{ id, pileType: "bored_pile"|"steel_pipe", diameter, length, pileCount, spacing{x,y} }`
- validation: diameter>0・pileCount>=1・spacing>0
- persistence: 保存

### 4.18 terrainReferences — R / TERRAIN
- `{ moduleId:"terrain", surfaceReference, coordinateContextId }`・supportごとのgroundElevationはderived参照
- **層別条件（凍結）**: reference containerは**必須**・resolved target（surface/ground）は**nullable**・embedment計算だけが**NOT_AVAILABLE**（Terrain未解決時）
- 欠落はwarning（geometry生成は可・embedment保留・fail-open明示）

### 4.19 existingReferences — R / EXT
- `{ moduleId:"terrain", documentReferenceId }`・interference情報はderived参照
- 欠落はwarning

### 4.20 geometryReference — D / SUB
- `{ snapshotFingerprint, snapshotVersion, generatedAt, model3DReference }`
- 下部工3D geometryのfingerprint（配置由来）・transient相当（再生成）

### 4.21 designInputs — C / SUB
- 基本設計入力（材料・許容値等はREFERENCE保持・採用値は認証Phase）
- 未認証Reactionはここに**入力データとして保持**（HOLD_NOT_AVAILABLE）

### 4.22 designResults — D / SUB
- runDesign出力（geometricQuantity実計算・全構造照査HOLD_NOT_AVAILABLE）
- designStatus: `NOT_AUTHORIZED|INCOMPLETE|READY|STALE|OK|NG|WARNING|ERROR`
- **NOT_AUTHORIZED自動昇格禁止**
- **legacy status変換表（凍結）**: 旧`hold_not_available` → 新`reactionStatus: "NOT_AVAILABLE"` + `designStatus`未変化・旧`NOT_AUTHORIZED` → 新`NOT_AUTHORIZED`維持

### 4.23 quantityResults — D / SUB
- 概算数量（体積/杭長）・実計算値（DERIVED）

### 4.24 validation — D / SUB
- `{ schemaVersion, validatedAt, ok, issues }`・直近結果のみ保存・再検証で上書き

### 4.25 extensions — C / SUB
- namespaceパターン（Phase 6-02では空許容）

## 5. fail-closed 統合規則（凍結）

1. BridgeLayoutDocument未設定 → SubstructureDocument write reject
2. Phase 4 Support Handoff / Phase 5 Handoff ok=false → derived更新不可（readonly参照可）
3. schemaVersion不整合 → parse/write reject
4. support必須入力欠落（supportId/placement/shape）→ **Gate validation**（VALIDATED条件）でreject。
   **DRAFT状態の保存**はpartial/MISSING許容（二段階validation・凍結）
5. designStatus / reactionStatus の NOT_AUTHORIZED **自動昇格禁止**
6. 未認証Reactionからの正式設計PASS生成禁止（HOLD_NOT_AVAILABLE維持）
7. composite等の合成規約違反 reject
8. 層別fail-closed: parser/validator=ok=false+issues / binding=typed exception（既存流儀）

## 6. persistence 対象まとめ（凍結）

| データ | 保存 | 備考 |
|---|---|---|
| SubstructureDocument（canonical入力・reference群・status） | **保存** | modules.substructure.data 内 |
| supportReferences / bearingReactionReferences / bearingSeatReferences（derived） | **transient（非保存）** | restore時にHandoff再生成＋一致検証 |
| geometryReference（fingerprint） | 保存（fingerprintのみ） | 本体は再生成 |
| designResults / quantityResults | **PersistedSubstructureDocumentDTO（別定義）にdigestのみ保存** | runtime型と永続化DTOを分離・restore時にparse/再計算で復元 |
| validation | 直近のみ保存 | 再検証で上書き |

## 7. 既存資産との対応

| 既存資産 | 利用 |
|---|---|
| `model.ts`（v0.2.0） | supports/Footing/PileGroup/BearingSeat/PierData/AbutmentDataのcanonical型ベース |
| `validation.ts` | 検証ロジック踏襲 |
| `deriveStableUuid` | documentId生成 |
| `BpValue` status語彙 | 値status |
| Phase 4 Support Handoff | supportReferences |
| Phase 5 SuperstructureHandoff | bearingReactionReferences |
| 旧`serializeSubstructureProject` | 参照（型の参考・移行はPhase 6-02アダプタ） |

## 8. 未決事項（Design Freeze前に全消去）

- 本Contractには未決事項なし。Phase 6-02実装時判断を要する箇所は本文中に明示
- 数値（材料・許容値・荷重）はREFERENCE保持（認証Phaseで採用）
