# Typed Liner Draft Schema vNext

## 0. 位置づけ

- 対象Phase: Phase3.5-1a
- 前提となる設計書: `docs/liner/project_file_format.md`, `docs/liner/schema_migration_policy.md`, `docs/liner/domain_model.md`, `docs/liner/phase3.5-0_investigation_report.md`
- この設計書で扱う範囲: Phase3.5で必須保存するliner domain draftの型、version管理、v0.1固定Z/offset draftからのmigration、後方互換境界
- この設計書で扱わない範囲: 実際の `schemas/*.json` 変更、TS型定義の実装、Frame Modelの `nodes/members` schema変更

## 1. 背景と目的

Phase3.5-0調査で、現状の `project.liner.draft` は `schemas/project.schema.json` 上 `additionalProperties: true` の自由形式であり、曲線・縦断・横断を安定保存するには型付きschemaが不足していることが判明した。

Phase3.5では、実装を始める前にdomain draftを正式な保存対象として定義する。水平曲線、縦断、横断、3D統合、exportはすべてこのTyped Draft Schema vNextを前提にする。

## 2. 用語定義

| 用語 | 定義 |
|---|---|
| Integration metadata | 既存 `liner.schemaVersion = "0.1.0"` で管理する `sourceRevision`, `linerModelId`, `intermediateSchemaVersion` などの生成メタデータ。 |
| Domain draft | ユーザーが編集する線形domain入力。Phase3.5以降は `liner.domainDraft` として必須保存する。 |
| `draftSchemaVersion` | Domain draft専用version。既存 `liner.schemaVersion` とは別管理。 |
| v0.1 fixed-z draft | 現行 `BuildIntermediateInput` 相当の `alignment / stationDefinition / offsets / sampleInterval / z` だけを持つDraft。 |
| Discriminated union | `type` fieldで `straight / arc / clothoid` 等を区別する型付き構造。 |

## 3. 確定方針（Human Decision反映）

- Decision #4: v0.1固定Z/offset Draftのみ非破壊migration対象。自由形式draftの完全変換は対象外。
- Decision #5: Project保存ではdomain draftを必須保存し、`liner.draftSchemaVersion` で管理する。
- Decision #8: Phase3.5では単一alignmentを継続する。複数alignmentは将来Phase。
- Decision #9: 表示用、DXF用、Frame分割用samplingを分離し、domain draft内で別設定として保存する。

## 4. ドメインモデル

疑似TS:

```ts
type LinerDraftSchemaVersion = "0.2.0";

interface ProjectLinerMetadataVNext {
  schemaVersion: "0.1.0";
  draftSchemaVersion: LinerDraftSchemaVersion;
  sourceRevision?: string;
  linerModelId: string;
  coordinatePolicyId: string;
  intermediateSchemaVersion?: "0.2.0";
  generatedAt?: string;
  domainDraft: LinerDomainDraftVNext;
}

interface LinerDomainDraftVNext {
  id: string;
  linerModelId: string;
  coordinatePolicyId: string;
  alignment: HorizontalAlignmentDraft;
  stationDefinition: StationDefinitionDraft;
  verticalAlignment: VerticalAlignmentDraft;
  crossSections: CrossSectionTemplateDraft[];
  gridDefinitions: GridDefinitionDraft[];
  spans: SpanDraft[];
  piers: PierDraft[];
  generationSettings: GenerationSettingsDraft;
  sampling: SamplingSettingsDraft;
}
```

主要field:

| 名前 | 型 | 必須 | 制約 | 説明 |
|---|---|---:|---|---|
| `liner.draftSchemaVersion` | string | Yes | `"0.2.0"` | Domain draftのversion。 |
| `liner.domainDraft` | object | Yes | vNext schema準拠 | 保存必須の編集domain。 |
| `alignment` | object | Yes | 単一alignment | 水平線形。 |
| `alignment.elements[]` | union | Yes | `straight/arc/clothoid` | 水平要素。 |
| `verticalAlignment.elements[]` | union | Yes | `grade/parabolic` | 縦断要素。固定Z migration時は1本のgradeに変換。 |
| `crossSections[]` | array | Yes | 1件以上 | 横断テンプレート。固定offset migration時はdefault templateを生成。 |
| `gridDefinitions[]` | array | Yes | 1件以上 | station範囲、横断参照、Frame分割設定。 |
| `sampling.display` | object | Yes | spacing/error | Preview用。 |
| `sampling.dxf` | object | Yes | spacing/error | DXF polyline近似用。 |
| `sampling.frame` | object | Yes | spacing/error | Frame細分化member用。 |

水平要素union:

```ts
type HorizontalElementDraft =
  | { type: "straight"; id: string; start: Vec2; azimuth: number; length: number }
  | { type: "arc"; id: string; start: Vec2; azimuth: number; radius: number; turn: "left" | "right"; length: number }
  | { type: "clothoid"; id: string; start: Vec2; azimuth: number; clothoidParameter: number; startRadius?: number | null; endRadius?: number | null; turn: "left" | "right"; length: number };
```

Sampling設定:

```ts
interface SamplingSettingsDraft {
  display: { maxChordLength: number; maxSagitta: number; minSegmentsPerElement: number };
  dxf: { maxChordLength: number; maxSagitta: number; minSegmentsPerElement: number };
  frame: { maxMemberLength: number; maxSagitta: number; stationIntervalFallback: number };
}
```

## 5. アルゴリズム / 計算要件

Migration判定:

1. `project.liner.draftSchemaVersion === "0.2.0"` かつ `domainDraft` が存在する場合はvNextとして読む。
2. `project.liner.draft` が存在し、`alignment/stationDefinition/offsets/z` のみで構成される場合はv0.1 fixed-z draftとしてmigrationする。
3. 自由形式draft、未知field依存draft、複数alignment風Draftは自動migration対象外。UIは読み込み不可診断を出し、新規作成または手動再入力を促す。

v0.1 fixed-z migration:

```text
domainDraft.alignment        = draft.alignment
domainDraft.stationDefinition = draft.stationDefinition
domainDraft.verticalAlignment = one grade segment with grade=0 and elevation=draft.z
domainDraft.crossSections    = one template from draft.offsets
domainDraft.gridDefinitions  = one default grid using stationDefinition interval and offsets
domainDraft.sampling.display = draft.sampleInterval or default
domainDraft.sampling.dxf     = default dxf settings
domainDraft.sampling.frame   = default frame settings
```

既定sampling:

| 系統 | 既定値 | 許容誤差 |
|---|---:|---:|
| display | max chord 0.5 m | max sagitta 0.005 m |
| dxf | max chord 0.1 m | max sagitta 0.001 m |
| frame | max chord 0.25 m | max sagitta 0.0025 m |

## 6. UI仕様

配置場所:

- `liner.setup` をタブ分割し、ライン、測点、高さ、縦断、横断、確認図を持つ。
- schema versionは通常UIでは編集不可とし、読み込み時のmigration bannerで表示する。

## 7. Pipeline統合

- `runPipeline(domainDraft, options)` はvNext domain draftのみを正式入力とする。
- Legacy draftはpipeline前にmigrationする。
- mapperは `domainDraft` ではなく、pipeline後のintermediate resultを入力にする。

## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| missing `liner.domainDraft` | error | `LINER_SCHEMA_INVALID` |
| unsupported `draftSchemaVersion` | error | `LINER_SCHEMA_INVALID` |
| legacy free-form draft | error | `LINER_SCHEMA_INVALID` |
| multiple alignment draft | error | `LINER_SCHEMA_INVALID` |
| sampling value <= 0 | error | `LINER_GRID_SPACING_INVALID` |

## 9. テスト方針

- Schema unit: valid v0.2.0 draftを受理する。
- Migration: v0.1 fixed-z/offset draftをvNextへ変換する。
- Round-trip: vNext save/loadで意味的同一性を維持する。
- Negative: unsupported version、missing domainDraft、複数alignmentを拒否する。

## 10. Migration / 後方互換

- 新規保存は `liner.domainDraft` のみ使用する。
- `liner.draft` は読み込み専用migration inputとする。
- `liner.schemaVersion` はintegration metadataのversionとして残す。
- `liner.draftSchemaVersion` はdraft payloadのversionとして追加する。
