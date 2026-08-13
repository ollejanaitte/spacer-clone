# Phase 7.2A: Target Architecture + Canonical Road Data / Single Source of Truth

- Phase: 7.2 Road/LINER Rescue 完全設計・Design Freeze
- baseline: 86d4d72e80dd21863c4dcdf77d6f475f7647355b（Phase 7.1 Final Report PR #989 merge後）
- 日付: 2026-08-13
- 凍結: D-01（正本） / D-02（保存先） / D-03（migration）

## 1. Phase 7.1成果物との再照合（実ファイル確認済み）

- 旧LINER: `frontend/src/liner/` 532ファイル残存（route接続・E2E test PASS）
- 現Road: `frontend/src/next/modules/road/` 10ファイル（計算wrapper・view-only UI）
- persistence経路: `modules.road.data.roadInput`（緩い型・UI保存）と `project.liner`（旧LINER埋込）が共存
- RoadDesignDocument: `contracts/roadDesignDocument.ts`（entity-registry・幾何値非保持）
- backend/rule_engine: main.py未配線（DORMANT）

## 2. 最終Target Architecture（Freeze）

```
旧LINER由来の実務Editor UI（KEEP/RESTORE/ADAPT）
        ↓ 編集（Canonical Road Inputへwrite）
Canonical Road Input（Single Source of Truth・新roadData）
        ↓ 導出（deterministic）
RoadDesignDocument（entity-registry契約・handoff/保管interchange）
        ↓ Project Data Core（modules.road.data）
Road Calculation / Intermediate Result（LINER kernel・現road wrapper）
        ↓
  2D Preview（MERGE・旧visual + 現RoadPreview）
  3D Road / Road CIM（現roadMesh/roadCimGeometry）
  Terrain / Existing
  Bridge Layout（下流・Phase 4/5契約）
  Superstructure / Substructure
  Analysis（Phase 7契約）
  Integrated 3D / downstream
```

- **「旧LINER」と「新Road」を2つの別システムとして残さない**。
- 新統合システムのRoad Moduleを正規入口とし、旧LINERの実務入力能力をそこへ救出・適合。

## 3. Single Source of Truth（D-01 Freeze）

### 3.1 判定

**Canonical Road Input = 旧LINERの `LinerDomainDraftVNext` スキーマ**（`frontend/src/liner/schema/types.ts:287`）を、新Road Moduleの `modules.road.data.roadData` へ保存したもの。

根拠:
- LinerDomainDraftVNextは**編集可能な全幾何値**（alignments(AlignmentBundleDraft)・measuredGrid・drawingSettings・ldist/haunch/hoso・generationSettings・sampling）を保持する唯一の実装済みschema。
- 旧LINER editor群（Horizontal/Vertical/CrossSection/Width/Crossfall/Station/Pier/Span）は**既にこのschemaへwriteする**（linerUiAdapter・domainDraft mapper）。
- 現roadInput（緩い型・unknown）はfield定義が不十分（widthChangePoints/crossSlopeIntervalsが無い）ため正本に不適。

### 3.2 各候補の責務（Freeze）

| 候補 | 責務 | 正本? | 保存 | derived? |
|---|---|---|---|---|
| **Canonical Road Input（LinerDomainDraftVNext型）** | 編集・計算の唯一source | **YES（正本）** | `modules.road.data.roadData` | 否 |
| `modules.road.data.roadInput`（旧・緩い型） | 旧Road UIの一時保存 | NO（廃止/移行） | — | 移行元 |
| `project.liner`（旧LINER埋込） | 旧データのlegacy read path | NO（移行元） | — | 移行元 |
| RoadDesignDocument | 下流handoff・.interchange・保管のentity-registry契約 | NO（derived） | 正本から再生成 | **YES（deterministic）** |
| Intermediate Result / mesh / CIM | 計算結果・表示 | NO | transient / 再生成 | YES |

### 3.3 保存形式（D-02 Freeze）

- 正本: `modules.road.data.roadData` = Canonical Road Input（LinerDomainDraftVNext準拠・version付き）。
- RoadDesignDocument: 正本から**決定論再生成**（`domainDraftToRoadDesignDocument` mapperをKEEP/ADAPT）。.spacerprojのinterchange互換性と下流handoffに使用。
- derived（intermediate/mesh/CIM）: 永続しない（再生成）。必要時のみcache（fingerprint管理）。

### 3.4 versioning（Freeze）

- Canonical Road Input schema version: `roadData` fieldに `schemaVersion`（旧draft schema 0.3.0・supported 0.1.0-0.3.0を継承）。
- 旧 `roadInput` のlabel/horizontal/vertical/crossSectionsは移行時に正本schemaへfield-mapping。
- RoadDesignDocument schemaVersion: 既存（0.1.x）を維持。
- **version migration registry**: 旧versionごとのmigration関数をregistry化（`schema/projectLinerMigration.ts`をADAPT）。非対応versionはfail-closed。

### 3.5 所有境界（Sol review反映）

| 領域 | 所有者 | 正本 | 下流 |
|---|---|---|---|
| Road（正本・編集） | Road Module | `roadData` | Bridge Layout等へhandoff |
| Bridge Layout | BridgeLayout module | BridgeLayoutDocument（Phase 4） | Super/Sub/手配 |
| RoadDesignDocument | Road Module（derived） | 正本から再生成 | .spacerproj interchange・handoff |
| Analysis | Analysis module（Phase 7） | AnalysisDocument | 照査/表示 |

- 二重所有禁止・境界を越えるwrite禁止（各moduleは自正本のみwrite）。

## 4. migration（D-03 Freeze・非破壊・fail-closed・atomic）

### 4.0 atomic migration protocol（Sol review反映）

migrationは**atomic commit**として実行:
1. 両legacy（project.liner / roadInput）を読み、**canonical形式へ正規化**（checksum canonicalization・sort_keys sha256）。
2. **conflict comparator**で両legacyの内容を比較（構造・値・source）。
3. 正本を**一度だけatomicに生成**（検証後・commit）。
4. 元データは不変（backup）。
5. 途中失敗は**rollback**（正本化しない・fail-closed）。

### 4.1 ケース別規則

### 4.1 ケース別規則

| ケース | 入力 | 規則 |
|---|---|---|
| 1. `project.liner` のみ | 旧LINER埋込 | 移行: domainDraftVNext → `modules.road.data.roadData`（正本）。legacyはread-onlyで保全。 |
| 2. `modules.road.data.roadInput` のみ | 旧Road UI保存 | 移行: roadInput（label/horizontal/vertical/crossSections）→ 正本schemaへfield-mapping（§5）。空/既定の場合は空正本。 |
| 3. 両方 | 共存 | **conflict detection**: 
  - roadInputが「Reference Mountain既定のみ」かつproject.linerが実データ → **project.liner優先**（より完全）。
  - roadInputに実編集データ → **roadInput優先**（新しい利用者の入力）。
  - 判定不能 → **block（fail-closed・破壊しない）**・migration issueを報告。 |
| 4. 新規 | なし | 空の正本（default）。 |
| 5. restart restore | 保存済み | 正本を読込→derived再生成→下流再計算。 |
| 6. Auto Save | runtime | 正本のみ保存（derivedは再生成）。 |
| 7. .spacerproj export/import | 正本+RoadDesignDocument | 正本をexport・import時に復元。 |
| 8. migration失敗 | 不正 | fail-closed・project破壊しない・issue記録。 |
| 9. schema version mismatch | 非対応 | fail-closed・旧versionはmigration registryで処理（旧0.1.0-0.3.0継承）。 |
| 10. legacy data欠損 | 一部欠落 | NOT_AVAILABLEで閉じる（発明しない）。 |

### 4.2 migration手順（Freeze）

1. 読込時に `modules.road.data.roadData` が無い場合のみmigration実行。
2. `project.liner` → 正本（mapper・決定論）。
3. `roadInput` → 正本（field-mapping）。
4. conflict検出（ケース3）は block + issue。
5. migrationは**非破壊**（元データは残す・書き換えない）。完了後 legacyはread-only保全。
6. fail-closed: 不正データは正本化しない。

## 5. Canonical Road Input schema（Freeze骨格）

`LinerDomainDraftVNext` を正本schemaとして採用。roadDataの構造:

```
modules.road.data.roadData = {
  schemaVersion: string;              // draft schema version（0.3.0継承）
  id: string;
  linerModelId: string | null;
  coordinatePolicyId: string | null;
  alignments: AlignmentBundleDraft[]; // 複数line・centerline/offset line
  activeAlignmentId?: string;
  activeLineId?: string;
  measuredGrid?: MeasuredGridDraft;
  selectedCrossSectionStation?: number;
  drawingSettings?: LinerDrawingSettingsDraft;
  ldistJobs?: LdistJobDraft[];
  haunchDefinitions?: HaunchDefinitionDraft[];
  hosoDefinitions?: HosoDefinitionDraft[];
  generationSettings: GenerationSettingsDraft;
  sampling: SamplingSettingsDraft;
  _meta: {
    source: "liner" | "roadInput" | "new";
    migratedAt?: string;
    roadLabel?: string;               // roadInput.label保全
  };
}
```

- **単位・符号・座標系**: 旧LINER tolerances（azimuth rad・coord m・station・offset）・座標（project-global XYZ・x沿線/y横断/z上）を継承（Phase 7-01A契約と整合）。
- **nullability**: 旧draftのnull許容を継承（measuredGrid等はoptional）。
- **validation**: 旧 `schema/validateProjectLinerExtension.ts` を正本validationとしてADAPT（KEEP）。

## 6. Double-write / silent divergence防止（Freeze）

- 正本以外へのwriteを禁止: editor群は全て `modules.road.data.roadData` へwrite。
- `roadInput` は廃止（移行後は書かない）。`project.liner` はread-only。
- RoadDesignDocument・derivedは正本から決定論再生成（手書き禁止）。
- checksum/fingerprint: 正本に `contentChecksum`（canonical JSON sha256・sort_keys・決定論）を付与。
- **dependency-scoped fingerprint**（Sol review反映）: 下流（BridgeLayout/Analysis等）のstale判定は、
  正本全体checksumではなく**依存スコープ別fingerprint**（例: horizontalのみ変更→verticalに影響しない）を
  使用して、不必要なSTALE化を避ける（Phase 7 IF3 fingerprint方式と整合）。
- **runtime rollback互換**（Sol review反映）: 正本schemaのread/writeは既存Project（project.liner/roadInput保持）と
  互換（読める・壊さない）。flag OFFで旧経路へ即時復帰可能。
