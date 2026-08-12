# Phase 5-01 Step A-01: SuperstructureDocument Contract（凍結案）

## 1. 目的

Phase 5（上部工）の正本ドキュメント **SuperstructureDocument** の契約を、
Phase 5-02 実装時に型設計判断が不要なレベルまで確定する。
本契約は Project Data Core の `modules.superstructure.data.superstructureDocument` に格納される。

- baseline: `4b58eae0a23d0670fc9c848eb3af3d20a08f9639`
- 日付: 2026-08-12

## 2. 基本仕様

| 項目 | 値 |
|---|---|
| schemaId | `spacer.next.superstructure-design-document` |
| schemaVersion | `0.1.0`（SEMVER） |
| documentKind | `superstructure-design` |
| 格納場所 | `modules.superstructure.data.superstructureDocument` |
| 上位正本 | Project（業務） |
| 入力正本 | BridgeLayoutDocument（reference・複製しない） |
| 既存BSDDとの関係 | **複製しない**。旧BSDD（`bridge-superstructure-design-document` v0.1.0）の構造・設計status governanceは参考とし、新契約はPDCのreference境界・ID規則に準拠した独自定義 |

### 2.1 BSDDとの関係（明文化）

- 旧BSDDは旧システム（App.tsx / Apollo）の上部工側carです。新システムでは使用しない。
- SuperstructureDocumentはBSDDの型を**コピーしない**。ただし以下は**設計思想として継承**する:
  - `designStatus` governance（NOT_AUTHORIZED / INCOMPLETE / READY / STALE / OK / NG / WARNING / ERROR）
  - 値のstatus語彙（CONFIRMED / DERIVED / MISSING / NOT_AUTHORIZED 等）
  - composite action禁止（`rc_non_composite` 固定）
- 旧BSDDデータの新Documentへの**自動移行はしない**。Phase 5-02はBridge Layoutから新規生成を正とする（設計順序準拠）。旧BSDDはREFERENCE保持。

## 3. ドキュメント全体構造（概要）

```ts
interface SuperstructureDocument {
  schemaVersion: string;            // "0.1.0"
  documentKind: "superstructure-design";
  documentId: string;               // uuid・安定ID
  projectId: string;                // uuid
  revisionId: number;               // >= 1
  status: DocumentLifecycleStatus;  // DRAFT|VALIDATED|APPROVED|STALE|ARCHIVED
  provenance: Provenance;           // createdAt/createdBy/producer
  timestamps: Timestamps;           // updatedAt/derivedAt
  bridgeLayoutReference: BridgeLayoutReference;      // reference
  roadReference: RoadReference;                     // reference
  spanReferences: SpanReferences;                   // derived from Span Handoff
  supportReferences: SupportReferences;             // derived from Support Handoff
  superstructureType: string;       // plate_girder_rc_slab_non_composite
  structuralSystem: StructuralSystem; // spanSystem/bridgeSystem
  girderConfiguration: GirderConfiguration;          // canonical（上部工所有）
  deckConfiguration: DeckConfiguration;              // canonical＋road参照
  crossBeamConfiguration: CrossBeamConfiguration | null;
  crossFrameConfiguration: CrossFrameConfiguration | null;
  bearingConfiguration: BearingConfiguration;        // 配置=derived / 形式=canonical
  geometryReference: GeometryReference | null;       // derived（snapshot fingerprint）
  loadModel: LoadModel;                               // Phase 5-02: 死荷重のみ＋活荷重境界
  analysisModel: AnalysisModel;                       // derived・NOT_AUTHORIZED
  designResults: DesignResults;                       // derived・NOT_AUTHORIZED
  reactionResults: ReactionResults;                   // derived・NOT_AUTHORIZED
  validation: Validation;                             // derived（直近の検証結果）
  extensions: Record<string, unknown>;                // 拡張（既存契約流儀）
}
```

## 4. 項目別詳細（owner / canonical / required / ID / version / validation / fail-closed / persistence / regeneration）

凡例:
- **kind**: C = canonical（正本・永続化）/ R = reference（ID参照・複製なし）/ D = derived（再生成）
- **owner**: SUPER = 上部工（SuperstructureDocument所有者）/ BL = Bridge Layout / ROAD / TERRAIN / EXT / PDC

### 4.1 schemaVersion
- kind: C / owner: PDC
- required: 必須 / const `"0.1.0"`
- validation: SEMVER pattern一致
- fail-closed: 不一致はparse reject・write reject
- persistence: 保存対象
- regeneration: 不可（契約版）

### 4.2 documentKind
- kind: C / const `"superstructure-design"` / 必須
- validation: const一致
- fail-closed: 不一致reject

### 4.3 documentId
- kind: C / owner: SUPER
- required: 必須
- ID規則: `deriveStableUuid("superstructure-design", bridgeId)`（既存`deriveStableUuid`流用・決定論的）
- validation: uuid形式
- fail-closed: 不正uuid reject
- persistence: 保存
- regeneration: bridgeId不変なら同一ID（再生成で変わらない）

### 4.4 projectId
- kind: R / owner: PDC / 必須 / uuid
- fail-closed: Project存在確認（PDC層で実施）

### 4.5 revisionId
- kind: C / owner: SUPER
- required: 必須 / integer >= 1
- 規則: canonical変更（ユーザー入力・superstructureType変更等）のたびに +1。derived再生成（レイアウト追従）では+0（`derivedAt`更新のみ）
- fail-closed: 非整数・非正 reject

### 4.6 status
- kind: C / owner: SUPER
- enum: `DRAFT | VALIDATED | APPROVED | STALE | ARCHIVED`
- 遷移: DRAFT（新規）→ VALIDATED（validation.ok）→ STALE（入力正本変更検出）→ APPROVED（Phase 5-02完了時のCompletion Gate。Phase 5-02で実装）
- fail-closed: 不正値reject。入力正本変更でSTALE化（derived不一致検出）

### 4.7 provenance
- kind: C / owner: SUPER
- `{ createdAt: string(ISO-8601 UTC), createdBy: string, producer: string }`
- createdBy/producer: `spacer-superstructure-module` 等（Phase 5-02で実装時に確定）
- validation: ISO-8601 UTC・非空string
- fail-closed: 不正reject

### 4.8 timestamps
- kind: C / owner: SUPER
- `{ updatedAt: string, derivedAt: string | null }`
- updatedAt: canonical変更時 / derivedAt: derived再生成時
- validation: ISO-8601 UTC
- fail-closed: 不正reject

### 4.9 bridgeLayoutReference
- kind: R / owner: BL
- `{ bridgeId: string, moduleId: "bridgeLayout", documentVersion: string, layoutFingerprint: string }`
- layoutFingerprint: BridgeLayoutDocumentの内容hash（変更検出用）
- **bridgeIdへの参照経路**: トップレベルに`bridgeId`を**複製しない**。参照は常に
  `bridgeLayoutReference.bridgeId`。各設計書・実装はこの経路を正とする
- required: 必須
- fail-closed: bridgeLayout module未存在・document未設定は write reject（fail-closed）
- persistence: 保存（ID参照のみ・内容複製なし）
- regeneration: 再生成可（正本はBridgeLayoutDocument）

### 4.10 roadReference
- kind: R / owner: ROAD
- `{ moduleId: "road", alignmentId: string, stationReferenceId: string | null, coordinatePolicyId: string | null }`
- 必須。上部工はこれを経由してalignmentへ参照（再実装しない）
- fail-closed: road未存在は write reject

### 4.11 spanReferences
- kind: D / owner: BL（生成元: buildSpanHandoff）
- 実体: `{ handoffId: string, schemaVersion: string, generatedAt: string, spans: SpanHandoffItem[] }`
  - SpanHandoffItem: `{ spanId, index, startSupportId, endSupportId, startStation, endStation, spanLength, startSupportSkew, endSupportSkew }`
- required（in-memory document）: 必須（>=1 span）。**ただし永続化DTOではtransient**
  - 永続化方針: 本derived配列は**シリアライズしない**。restore時に
    `buildSpanHandoff(manager, projectId, bridgeLayoutDocument)` から再生成し、
    derived一致検証（保存時キャッシュがあれば突合）を経て in-memoryへ復元
- validation: chain連続・Σ=bridgeLength・spanLength>0（Span Handoff検証を継承）
- fail-closed: Span Handoffがok=falseなら derived生成不可（write reject）
- persistence: 非保存（transient・再生成）
- regeneration: 常時 `buildSpanHandoff(...)` から毎回再生成
- 参照経路: 他の設計書・実装は `spanReferences.spans[]`（spansは配列）を正とする

### 4.12 supportReferences
- kind: D / owner: BL（生成元: buildSupportHandoff）
- 実体: `{ handoffId: string, schemaVersion: string, generatedAt: string, supports: SupportHandoffItem[] }`
  - SupportHandoffItem: `{ supportId, supportType, label, station, position{domainX,domainY,elevation}, tangentAzimuthRad, skewAngleRad, skewSource, terrainElevation, roadReferenceId, coordinateContextId }`
  - `position.domainX/domainY/elevation` は**Project-global XYZ**（LINER由来）。station基準のlocal frameは
    `tangentAzimuthRad`＋snapshot localFrame（tangent/transverse/vertical）で別途表現。両者を混同しない
- required（in-memory document）: 必須（>=2 support）。**永続化DTOではtransient**（§4.11と同方針）
- validation: A1<P1<…<A2順序・station finite・skew規約（counterclockwise-positive）
- fail-closed: Support Handoffがok=falseなら derived生成不可
- persistence: 非保存（transient・再生成）
- regeneration: 常時 `buildSupportHandoff(...)` から毎回再生成

### 4.13 superstructureType
- kind: C / owner: SUPER / 必須
- 第一正: `"plate_girder_rc_slab_non_composite"`（既存`SUPERSTRUCTURE_KIND_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE`流用）
- validation: enum（拡張は後続Phaseで追加）
- fail-closed: 未対応type reject

### 4.14 structuralSystem
- kind: C（canonical入力）/ owner: SUPER / 必須
- `{ spanSystem: "simple" | "continuous", bridgeSystem: "SIMPLE_SINGLE" | "CONTINUOUS" }`
- 既定: `continuous`。**canonical入力とderived解決を分離**する
  - canonical入力: `spanSystem`（上部工が明示 or 既定continuous）
  - derived解決: `effectiveSystem`（spanReferences.spans数から導出: 1 span→SIMPLE_SINGLE / >=2→CONTINUOUS）
  - `bridgeSystem`はderived解決結果。canonical `spanSystem` と derived `bridgeSystem` の整合をvalidationで検証
- validation: spans数と整合（SIMPLE_SINGLE=1 span / CONTINUOUS>=2）・不一致は issue（write reject）
- fail-closed: 不整合reject
- persistence: canonical入力（spanSystem）のみ保存。bridgeSystemは再生成 / regeneration: 不可（上部工判断）

### 4.15 girderConfiguration
- kind: C（主桁配置は上部工所有）/ owner: SUPER / 必須
- `{ girderCount: number, girderSpacingM: number | null, girderLines: GirderLine[] }`
- GirderLine: `{ girderId: string, index: number, label: string, offsetFromCenterline: number (m), offsetEndFromCenterline: number | null (m), materialRefId: string | null, sectionIntentRefId: string | null }`
- girderId規則: `G1..Gn`（index順・`G${index+1}`）
- **offset生成規則（凍結）**: 
  - `girderSpacingM`（canonical・等間隔）を指定した場合、offsetは
    `(i - (n-1)/2) * spacing` で**自動導出（derived）**
  - 個別offsetFromCenterline指定は上部工所有の**override**。両方が無い場合は
    offsetを**発明しない**（MISSING・fail-closed）
  - 重複offsetは**許可しない**（girder間隔0は不合理・reject）
- girderSectionModel（断面・設計入力・canonical・任意）: 
  - `{ depthM: number | null, webThicknessM: number | null, topFlange: { widthM, thicknessM } | null, bottomFlange: { widthM, thicknessM } | null, areaM2: number | null, unitWeightPerM: number | null }`
  - Phase 5-02では**宣言値のみ**（全てnull許容・MISSING）。断面性能計算・自重・基本照査は
    宣言値がある場合のみ実施し、MISSINGなら照査保留（fail-closed・NOT_AVAILABLE）
- validation: girderCount>=1・offset有限・girderId一意・girderSpacingM>0 if present
- fail-closed: girderCount不一致・offset非有限・重複offset reject
- persistence: 保存（canonical）/ regeneration: 不可（ユーザー入力・自動導出のみ）
- 変更追従: Bridge Layout変更時はoffset・本数は維持（layout追従しない）→ status=STALE検出のみ

### 4.16 deckConfiguration
- kind: C（canonical入力: 厚さ・overhang・unitWeight。幅はderived）/ owner: SUPER＋ROAD
- 実体（canonical入力とderived解決を分離）:
  - canonical入力: `{ deckId: string, deckKind: "rc_non_composite", thicknessM: number | null, unitWeight: number | null, overhangLeftM: number | null, overhangRightM: number | null }`
  - derived解決: `resolvedWidthM: number | null`（= Road横断幅＋overhang。Road Module APIから導出・未取得ならMISSING）
- deckId規則: `DECK-1`（安定ID）
- thicknessM: 上部工所有（未宣言ならMISSING・発明しない）
- validation: thickness>0 if present・overhang>=0・resolvedWidth>0 if present
- fail-closed: 不正reject。composite action禁止（rc_non_composite固定）
- persistence: canonical入力のみ保存（厚さ/overhang/unitWeight）。resolvedWidthは再生成
- regeneration: resolvedWidthはroad参照再評価可、canonical入力は不可（ユーザー入力）

### 4.17 crossBeamConfiguration
- kind: C / owner: SUPER / 任意（連続橋では必須とする）
- `{ crossBeamSpacingM: number, crossBeams: CrossBeam[] }`
- CrossBeam: `{ crossBeamId, kind: "end"|"support"|"intermediate", stationM, depthM: number|null, widthM: number|null }`
- crossBeamId規則: `XB-{supportId}`（support位置）`XB-i-{n}`（中間）
- Phase 5-02スコープ: **配置のみ生成**（end/support cross beamはsupport位置必須・中間はspacingで自動）。断面寸法はnull（DEFER）
- validation: end/support cross beamが全support位置に存在（連続）・station重複なし
- fail-closed: 配置整合reject
- persistence: 保存（canonical配置・寸法はnull可）

### 4.18 crossFrameConfiguration
- kind: C / owner: SUPER / 任意（Phase 5-02では**配置のみ**・詳細はDEFER）
- `{ crossFrameSpacingM: number, swayBracing: { intervalM: number }, lateralBracing: { intervalM: number } }`
- Phase 5-02スコープ: 間隔入力のみ。部材断面はnull（DEFER）
- validation: interval>0
- fail-closed: 不正reject

### 4.19 bearingConfiguration
- kind: 配置=D（snapshot由来）/ 形式=C（上部工所有）
- `{ bearingSupportRelation: BearingRelation[], bearingSeats: BearingSeat[] }`
- BearingRelation（配置・derived）: `{ supportId, girderId }`（support×girderの支承対応・snapshot.bearingPoints由来・dedupe）
- BearingSeat（形式・canonical）: `{ seatId, supportId, girderId, bearingType: "rubber"|"fixed"|"movable"|null, fixedOrMovable: "FIXED"|"MOVABLE"|"UNDECIDED", longitudinalDirection: "+station"|"-station"|null, transverseDirection: "L"|"R"|null }`
- seatId規則: `BRG-{supportId}-{girderId}`
- Phase 5-02スコープ: 配置（relation）は確定・生成。形式（bearingType/fixedOrMovable）は上部工入力（既定 UNDECIDED・詳細は後続Phase）
- validation: relation一意・support/girder存在
- fail-closed: 重複・dangling reject
- persistence: 保存（形式canonical・配置derivedキャッシュ） / regeneration: 配置はsnapshotから再生成

### 4.20 geometryReference
- kind: D / owner: SUPER（生成元: DefaultGeometryEngine）
- `{ snapshotFingerprint: string, snapshotVersion: string, generatedAt: string, model3DReference: { solidsDigest: string | null } }`
- fingerprint: 既存`computeFingerprint`（fnv1a32）利用
- required: 必須（snapshot生成後のみセット・生成前はnull）
- fail-closed: fingerprint不一致（再生成と突合）は STALE検出
- persistence: fingerprintのみ保存（snapshot本体は非保存）
- regeneration: SuperstructureDocument→binding→GeometryEngineInput→generateSnapshot（決定論的）

### 4.21 loadModel
- kind: C（死荷重パラメータ）/ D（算出値）/ owner: SUPER
- Phase 5-02スコープ（凍結）:
  - `deadLoads`（分類・**二重計上防止のpartitionを明示**）:
    - `structuralGirder`（鋼主桁自重・DL-STRUCTURALの一部）
    - `structuralSecondary`（横桁・横構・支承自重・DL-STRUCTURALの一部）
    - `deck`（RC床版自重・DL-DECK）
    - `pavement`（舗装・入力境界・空）
    - `appurtenances`（高欄/地覆/中央分離帯・入力境界・空）
  - `liveLoad`: **入力境界のみ**（`liveLoadReference: null` 明示・本計算はDEFER）
  - 詳細は Phase5-01D-01 へ
- validation / fail-closed: 詳細設計書参照

### 4.22 analysisModel
- kind: D / owner: SUPER（生成元: analysis adapter）
- 実体: `{ analysisStatus: "NOT_AUTHORIZED"|"NOT_AVAILABLE"|"PENDING"|"READY", modelReference: { grillageModelDigest: string|null }, authorization: { numericDesignAuthorization: "NOT_GRANTED", stateReason } }`
  - **digestフィールド名は `modelReference.grillageModelDigest` に統一**（他の設計書もこれに従う）
- Phase 5-02スコープ: 解析実行はgrillage/solver。数値認証は NOT_GRANTED 維持（既有方針）
  - NOT_GRANTEDの解析結果は `analysisStatus: "NOT_AUTHORIZED"` として保持（自動昇格禁止）
  - 認証後は人が `READY` へ遷移（Phase 5-02では対象外）
- validation / fail-closed: 詳細設計書参照

### 4.23 designResults
- kind: D / owner: SUPER
- `{ designStatus: "NOT_AUTHORIZED"|"INCOMPLETE"|"READY"|"STALE"|"OK"|"NG"|"WARNING"|"ERROR", checks: DesignCheckResult[], reactionResultsReference: { reactionDigest: string|null } }`
- Phase 5-02スコープ: 基本照査（断面性能・桁力・応力度・たわみ・横桁基本・支承基本）。詳細は Phase5-01D-01
- fail-closed: NOT_AUTHORIZEDの自動昇格禁止（既存design-status governance継承）

### 4.24 reactionResults
- kind: D / owner: SUPER
- 実体: `{ reactionStatus: "NOT_AUTHORIZED"|"NOT_AVAILABLE", reactionCases: ReactionCase[] }`
- ReactionCase（**seat別・単位明示・support集約と分離**）:
  - `{ caseId, combinationId, seatId, supportId, girderId, Fx, Fy, Fz, Mx, My, Mz, unit: "kN", momentUnit: "kNm", signConvention: { force: "up-positive", moment: "right-hand-rule" } }`
  - caseId規則: `RC-{combinationId}-{seatId}`（seat別反力の一意化）
  - seat別（girder別）反力が基本。support集約値は別フィールド `supportTotals[]`（任意）
- Phase 6への Handoff 入力（Phase5-01D-02でContract確定）
- **受け渡し方針（凍結）**: NOT_AUTHORIZEDの反力は**入力データとしてPhase 6へ受け渡し可**
  （既存substructure pattern踏襲）。designStatus等の自動昇格は禁止。authorized扱いにするには人の承認を要する
- fail-closed: 数値有限・seatId/girderId存在・combinationId整合

### 4.25 validation
- kind: D / owner: SUPER
- `{ schemaVersion: string, validatedAt: string, ok: boolean, issues: { path, message }[] }`
- persistence: 直近結果のみ保存（再検証で上書き）
- regeneration: 常時再計算

### 4.26 extensions
- kind: C / owner: SUPER
- 既存`extensions`契約流儀（namespaceパターン）。Phase 5-02では未使用（空を許容）

## 5. fail-closed 統合規則（凍結）

1. BridgeLayoutDocument未設定 → SuperstructureDocument write reject
2. Span/Support Handoff が ok=false → derived更新不可（readonly参照は可）
3. schemaVersion不整合 → parse reject
4. 上部工必須入力欠落（girderCount/offset等）→ write reject（MISSINGは許容・発明しない）
5. designStatus / analysisStatus / reactionStatus の NOT_AUTHORIZED **自動昇格禁止**
   （人の承認を経由するまでauthorized扱いにしない）
6. composite action 禁止（rc_non_composite固定）
7. fail-closed方式の層分け: **parser/validatorは `ok=false + issues`（throwしない）**。
   **binding層（GeometryEngineInput生成）はtyped exception**（既存`BridgeProjectAdapterError`流儀）。
   test仕様（E-03）もこの層分けに従う

## 6. persistence 対象まとめ（凍結）

| データ | 保存 | 備考 |
|---|---|---|
| SuperstructureDocument（canonical入力・status・provenance・reference群） | **保存** | modules.superstructure.data 内。derived配列はtransient |
| spanReferences / supportReferences（derived配列） | **非保存（transient）** | restore時に再生成＋derived一致検証。in-memoryのみ |
| GeometrySnapshot本体 | **非保存** | fingerprintのみ・再生成 |
| analysis / reaction digest | **保存（digestのみ）** | `modelReference.grillageModelDigest`・`designResults.reactionResultsReference.reactionDigest` |
| 解析結果本体 | **非保存** | 再計算で再現（決定論） |

## 7. 既存資産との対応（Contract定義で利用するもの）

| 既存資産 | 利用 |
|---|---|
| `deriveStableUuid` | documentId生成 |
| `BpValue` status語彙 | 値status |
| `BridgeProjectSuperstructure`（旧） | 構造の参考（girder arrangement/deck/bearing relation） |
| `SpanHandoff` / `SupportHandoff`（既存ビルダー） | spanReferences/supportReferences生成 |
| `computeFingerprint` | geometryReference |
| 旧BSDD schema | 設計思想のみ参照・型コピーしない |

## 8. 未決事項（Design Freeze前に全消去）

- 本設計書には未決事項なし。Phase 5-02実装時判断を要する箇所はすべて本文中に明示（Phase 5-02で固定値を実装）
- 数値（材料・荷重・許容値）はPhase 5-01ではREFERENCE保持（DS-00..09の採用判断は設計check実装Phaseに委ね、本Contractでは構造のみ凍結）
