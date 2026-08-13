# Phase 7-01A: AnalysisDocument Contract

- Phase: 7-01 Step A
- baseline: `288edc59f4445b3337e95970a3ab50a24aff5e2c`
- 日付: 2026-08-13
- 凍結: Design Decision D-02 / D-11 / D-14 / D-16

## 1. 位置づけ

- AnalysisDocumentは**解析唯一正本**（derived正本）。
- 上流正本（BridgeLayout / Superstructure / Substructure）+ GeometrySnapshotから
  **deterministic生成**される。
- 上流3正本・GeometrySnapshotを複製しない（sourceReferenceで追跡）。
- Solver入力はAnalysisDocumentから生成する（Solver内部データは正本にしない）。
- Viewer data・Adapter/Connector/Bindingに別正本を作らない。

## 2. Schema識別

| 項目 | 値 |
|---|---|
| schemaId | `spacer.contracts.analysis-document` |
| schemaVersion | `1.0.0`（frozen・Phase 7-02で変更禁止） |
| documentKind | `analysis-document` |
| documentId | UUID v4（生成時） |
| 保存 | `.spacerproj`内のPDC document + 必要時独立JSON |

## 3. 全field定義

凡例：owner = 生成層 / 種別 = canonical | derived | transient / required = 必須 | 任意

### 3.1 Envelope

| field | type | owner | 種別 | required | unit/sign/axis | ID | validation | fail-closed |
|---|---|---|---|---|---|---|---|---|
| schemaId | string | AnalysisModule | canonical | 必須 | — | — | const | mismatch→reject |
| schemaVersion | string | 同上 | canonical | 必須 | — | — | semver=1.0.0 | 非対応version→reject |
| documentKind | string | 同上 | canonical | 必須 | — | — | const="analysis-document" | 不一致→reject |
| documentId | UUID | 同上 | canonical | 必須 | — | uuid | format | 不正→reject |
| projectId | string | ProjectCore | canonical | 必須 | — | projectId | 存在 | 不在→reject |
| revisionId | int | 同上 | canonical | 必須 | — | monotonic | >=1 | 非正→reject |
| status | enum | 同上 | canonical | 必須 | — | — | DRAFT/VALIDATED/APPROVED/STALE/ARCHIVED | — |
| contentChecksum | sha256 | 同上 | canonical | 必須 | — | contentChecksum | IF3形式 | 不正→reject |
| provenance | object | 同上 | canonical | 必須 | — | producer | 形式 | — |
| timestamps | object | 同上 | canonical | 必須 | — | updatedAt/derivedAt | ISO-8601 | — |
| extensions | Record | 各layer | transient | 任意 | — | — | JSON | — |

### 3.2 sourceReferences（上流正本への追跡・R8/R12）

| field | type | owner | 種別 | required | 内容 |
|---|---|---|---|---|---|
| bridgeLayout | object | AnalysisModule | derived | 必須 | `{bridgeId, documentVersion, layoutFingerprint}` |
| superstructure | object | 同上 | derived | 必須 | `{superstructureDocumentId, documentVersion, dataFingerprint, geometrySnapshotFingerprint}` |
| substructure | object | 同上 | derived | 必須 | `{substructureDocumentId, documentVersion, dataFingerprint}` |

- **Fingerprint**: 各上流documentの確定性digest（superstructure/structure moduleが既存保有のfingerprint方式を継承）。
- 上流変更検知 = fingerprint/version比較（Phase7-01D_persistence_stalenessで詳細）。

### 3.3 coordinateContext（R11）

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| coordinatePolicyId | string|null | derived | 必須 | LINER/Project政策参照 |
| axisConvention | const | derived | 必須 | `"x-along/y-transverse/z-up"` |
| handedness | const | derived | 必須 | `"right"` |
| unitSystem | const | derived | 必須 | `"metric"` |
| positionConvention | const | derived | 必須 | `"project-global-XYZ"` |
| signConvention | object | derived | 必須 | `{reactionZ:"up-positive", moment:"right-hand-rule", skew:"counterclockwise-positive"}` |
| globalOrigin | Vec3 | derived | 必須 | m |

### 3.4 unitContext

| field | 値 |
|---|---|
| length | m |
| force | kN |
| moment | kNm |
| modulus | kN/m² |
| density | kN/m³ |
| angle | rad |

### 3.5 nodes

| field | type | 種別 | required | unit/axis | ID規約 |
|---|---|---|---|---|---|
| entityId | UUID | canonical | 必須 | — | uuid5(analysis-namespace, `node:<sourceEntityId>`) |
| sourceEntityId | string | derived | 必須 | — | GeometrySnapshot supportPoint.id / girder交点 |
| sourceKind | enum | derived | 必須 | — | supportPoint / girderPanel / crossBeamPoint / deckPoint / substructureNode |
| x/y/z | number | derived | 必須 | m・project-global | 有限必須 |
| coordinateContextId | UUID | derived | 必須 | — | coordinateContext参照 |
| stationM | number | derived | 任意 | m | 有限 |
| offsetM | number | derived | 任意 | m | 有限 |

### 3.6 members/elements

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| entityId | UUID | canonical | 必須 | uuid5(`member:<sourceEntityId>`) |
| sourceEntityId | string | derived | 必須 | 上流member source（grillage `M-L-…`/`M-T-…` or SuperstructureDocument由来） |
| sourceKind | enum | derived | 必須 | mainGirder / crossBeam / crossFrame / swayBracing / lateralBracing / stiffener |
| elementType | const | canonical | 必須 | `"frame"`（beam 12DOF・Phase 7-02スコープ） |
| nodeIId/nodeJId | UUID | canonical | 必須 | AnalysisDocument内node参照 |
| materialId | UUID | canonical | 必須 | material参照 |
| sectionId | UUID | canonical | 必須 | section参照 |
| memberKind | enum | derived | 必須 | mainGirder / crossBeam / crossFrame / swayBracing / lateralBracing / stiffener |
| orientationVector | Vec3 | derived | 必須 | member local y方向指定（横桁対応・R1解決） |
| localAxis | object | derived | 任意 | x/y/z local frame |
| release | object|null | derived | 任意 | **契約定義のみ**（i/j端・DOF・M/V/N release・solver実装はDEFER） |
| eccentricity | Vec3|null | derived | 任意 | **契約定義のみ**（DEFER・solver実装なし） |

### 3.7 materials

| field | type | 種別 | required | unit |
|---|---|---|---|---|
| entityId | UUID | canonical | 必須 | uuid5(`material:<sourceEntityId>`) |
| sourceEntityId | string | derived | 必須 | SuperstructureDocument source material id |
| sourceKind | enum | derived | 必須 | structuralSteel / concrete / NOT_AVAILABLE |
| name | string | derived | 任意 | — |
| elasticModulus E | number | derived | 必須 | kN/m²（正有限） |
| shearModulus G | number | derived | 必須 | kN/m² |
| poissonRatio ν | number | derived | 必須 | —（|ν|<0.5） |
| density ρ | number | derived | 必須 | kN/m³ |
| source | enum | derived | 必須 | CONFIRMED / DERIVED / NOT_AVAILABLE |

### 3.8 sections（R7解決）

| field | type | 種別 | required | unit |
|---|---|---|---|---|
| entityId | UUID | canonical | 必須 | uuid5(`section:<sourceEntityId>`) |
| sourceEntityId | string | derived | 必須 | SuperstructureDocument girderSectionModel由来 |
| sourceKind | enum | derived | 必須 | girderSectionModel / computed / NOT_AVAILABLE |
| name | string | derived | 任意 | — |
| area A | number | derived | 必須 | m² |
| iy / iz | number | derived | 必須 | m⁴ |
| j (torsion) | number | derived | 必須 | m⁴ |
| depthM/webThicknessM/flange | number|null | derived | 任意 | m（check層向け） |
| derivation | enum | derived | 必須 | DECLARED_INTENT / COMPUTED / NOT_AVAILABLE |
| unitWeightPerM | number|null | derived | 任意 | kN/m |

- **section property source**: `superstructureTypes.GirderSectionModel` + `computeSuperstructureSectionProperties`（KEEP）。
  area/iy/iz/jはgirder断面（I断面・box非対応）から導出。欠損時 NOT_AVAILABLE で解析不可fail-closed。

### 3.9 supports

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| entityId | UUID | canonical | 必須 | uuid5(`support:<sourceEntityId>`) |
| sourceEntityId | string | derived | 必須 | `{supportId}` or `{supportId}-{girderId}`（BridgeLayout/Superstructure由来） |
| sourceKind | enum | derived | 必須 | bridgeLayoutSupport / bearingSeat / substructureSupport |
| nodeId | UUID | canonical | 必須 | AnalysisDocument node参照 |
| seatId | string|null | derived | 任意 | `BRG-{supportId}-{girderId}`（bearing seat対応時） |
| constraint | object | derived | 必須 | `{ux,uy,uz,rx,ry,rz: boolean}`（bool DOF・D-08 mapping結果） |
| springId | UUID|null | derived | 任意 | spring参照（elastic support時） |
| localFrame | object | derived | 任意 | tangent/transverse/vertical |
| source | enum | derived | 必須 | FROM_BEARING / FROM_SUPPORT / NOT_AVAILABLE |

### 3.10 constraints / releases / rigidLinks（R23）

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| constraints | array | derived | 任意 | support DOF拘束（bool）＝§3.9と重複管理しない（supportsに集約） |
| releases | array | derived | 任意 | member端release（**契約のみ・solver実装DEFER**） |
| rigidLinks | array | derived | 任意 | rigid link（**契約のみ・solver実装DEFER**） |
| mpc | array | derived | 任意 | MPC/equality constraint（**契約のみ・solver実装DEFER**） |

### 3.11 bearings（R5解決）

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| entityId | UUID | canonical | 必須 | uuid5(`bearing:<sourceEntityId>`) |
| sourceEntityId | string | derived | 必須 | seatId `BRG-{supportId}-{girderId}` |
| seatId | string | derived | 必須 | `BRG-{supportId}-{girderId}` |
| supportId | string | derived | 必須 | — |
| girderId | string | derived | 必須 | — |
| bearingType | enum|null | derived | 必須 | rubber / fixed / movable / pot / custom / null |
| fixedOrMovable | enum | derived | 必須 | FIXED / MOVABLE / UNDECIDED |
| position | Vec3 | derived | 必須 | m・project-global |
| localFrame | object | derived | 必須 | longitudinal/transverse/vertical axis |
| dofConstraint | object | derived | 必須 | mapping結果（Phase7-01B_bearing_support_spring_contractのtable） |
| springId | UUID|null | derived | 任意 | rubber等のspring時 |

### 3.12 springs / foundationSprings（R4解決）

| field | type | 種別 | required | unit |
|---|---|---|---|---|
| entityId | UUID | canonical | 必須 | uuid5(`spring:<sourceEntityId>`) |
| sourceEntityId | string | derived | 必須 | substructure/superstructure source id（無ければNOT_AVAILABLEで閉じる） |
| source | enum | derived | 必須 | TRANSLATIONAL / ROTATIONAL |
| nodeId | UUID | canonical | 必須 | 適用node |
| dof | enum | derived | 必須 | ux/uy/uz/rx/ry/rz |
| coordinateSystem | enum | derived | 必須 | local / global |
| stiffness | number|null | derived | 必須 | kN/m or kNm/rad |
| valueState | enum | derived | 必須 | CONFIRMED / SOURCE_NOT_AVAILABLE / NOT_AUTHORIZED / NOT_AVAILABLE |
| zero/infinite表現 | — | — | — | 0=rigid解放ではない（0は無支持・無限はbool拘束で表現） |

- **値が資料に存在しない場合は補完しない**。valueStateで閉じる（fail-closed）。

### 3.13 loadCases / loadCombinations（R2解決）

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| loadCases[].caseId | string | derived | 必須 | `DL-STRUCTURAL` / `DL-DECK` / `DL-PAVEMENT` / `DL-APPURTENANCE` / `LL` |
| loadCases[].kind | enum | derived | 必須 | dead / live / other |
| loadCases[].state | enum | derived | 必須 | CONFIRMED / DERIVED / MISSING |
| loadCases[].source | string | derived | 必須 | SuperstructureDocument.loadModel |
| nodalLoads[] | array | derived | 任意 | `{id, loadCaseId, nodeId, fx..mz}` kN/kNm・global |
| memberLoads[] | array | derived | 必須（DL系） | `{id, loadCaseId, memberId, type:distributed/point, direction, magnitude, coordinateSystem:local/global}`（**支間分布載荷を正式仕様とする**） |
| loadCombinations[] | array | derived | 必須 | `{combinationId, expression, factors, resultCaseId}` |
| COMBO-1 | object | derived | 必須 | `COMBO-1 = 1.0·DL-STRUCTURAL + 1.0·DL-DECK`（実行可能） |
| 他組合せ | array | derived | 任意 | 宣言構造（DEFER・実行しない） |

### 3.14 analysisSettings / solverReference

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| analysisType | const | canonical | 必須 | `linear_static`（Phase 7-02 IMPLEMENT） |
| solver | const | canonical | 必須 | `scipy_sparse` |
| solverVersion | string | canonical | 必須 | IF3 solver version（`^0.3.`整合） |
| includeShearDeformation | const | canonical | 必須 | false |
| largeDisplacement | const | canonical | 必須 | false |
| options | object | derived | 任意 | eigen/RSのmassCaseId/modeCount等（KEEP接続） |

### 3.15 analysisStatus / resultReferences

| field | type | 種別 | required | 内容 |
|---|---|---|---|---|
| analysisStatus | enum | canonical | 必須 | NOT_RUN / RUNNING / SUCCEEDED / FAILED / STALE / PARTIAL / NOT_AVAILABLE |
| resultReferences[] | array | canonical | 任意 | IF3 `persistedResultRef`互換（`{documentKind, documentId, revisionId, contentChecksum, uri}`） |
| modelDigest | sha256 | canonical | 必須 | AnalysisDocument（解析model部）のdigest |
| resultDigest | sha256 | canonical | 任意 | 最新結果digest |

### 3.16 validation / provenance / revision

| field | 内容 |
|---|---|
| validation | `{schemaVersion, validatedAt, ok, issues[]}`（fail-closed） |
| provenance | `{createdAt, createdBy, producer:"spacer-analysis-module"}` |
| revision | `{revisionId, updatedAt, changes[]}` |
| regeneration | 上流変更時はrevisionId++し**再生成**（手修正を正本にしない） |

## 4. ID規約（D-11確定）

- 全entity IDは `uuid5(namespace, "<kind>:<sourceEntityId>")` で決定論生成。
- 全entityに **`sourceEntityId` + `sourceKind`** を保持（統一命名。kind=node/member/material/section/support/bearing/spring）。
- namespace: **`a12d8c1e-11f4-4d6b-9a2e-7f8c5d0e1b3a`（analysis専用・固定・Phase 7-02で変更禁止）**
  （IF3 namespace `f7d7c8b4-24b2-47d8-8f8f-e91fc9a95ed5` とは別。IF3行IDは既存IF3 namespaceを使用）。
- sourceEntityIdは上流（GeometrySnapshot / SuperstructureDocument / SubstructureDocument）由来。
- **source entity IDへ追跡可能**（sourceEntityId保持・resultのentityIdも同system）。

## 5. validation / fail-closed

- 上流fingerprint不一致 → `SOURCE_MISMATCH` で再生成要求（STALE）。
- 数値非有限 → reject（`INVALID_NUMERIC_VALUE`）。
- section/material欠損 → `NOT_AVAILABLE`・解析不可fail-closed（fallback禁止）。
- spring/load値が無い → `SOURCE_NOT_AVAILABLE` / `MISSING`（補完禁止）。
- 未対応要素（shell/nonlinear等）→ `UNSUPPORTED_ANALYSIS` reject。
- 全field検証結果は `validation` に記録。

## 6. persistence / regeneration

- AnalysisDocumentはPDC（.spacerproj）へ保存（永続正本）。
- 上流変更時：sourceReference比較→fingerprint不一致→**再生成**（revisionId++）。
- 再生成はdeterministic（同じ上流→同じAnalysisDocument内容）。
- Solver結果はIF3 sidecar（results/<uuid>.if3.json）へ（Phase7-01D）。

## 7. 既存frame documentとの関係（D-03確定）

| 項目 | 既存 `bridge-frame-analysis-document`（v0.1.0） | 新 `analysis-document`（v1.0.0） |
|---|---|---|
| 用途 | Phase 0 IF3契約ファミリのskeleton・$ref破損・production未使用 | production解析唯一正本 |
| 扱い | **DEPRECATE（COMPATIBILITY）**・削除しない | **新正本** |
| IF3 binding | frame documentをsourceとして想定 | AnalysisDocumentをsourceとしてADAPT |
| persistedResultRef | 既存契約を継承 | 同形式を継承 |
| capability block | springs/memberReleases等の宣言 | AnalysisDocumentのspring/release実体へ対応 |

## 8. Schema実装方針（Phase 7-02 WP-A）

- TypeScript型（`frontend/src/next/modules/analysis/analysisDocumentTypes.ts`）＋JSON Schema（`schemas/contracts/v0.1/analysis-document.schema.json`）。
- backend `model.py`の解析projectはAnalysisDocumentからsolver input adapterで生成（AnalysisDocument自身はbackend solverへ直接渡さない）。
- validationはzod or 既存contract validation方式を踏襲（Phase 5/6と統一）。
