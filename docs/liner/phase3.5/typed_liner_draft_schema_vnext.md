# Typed Liner Draft Schema vNext

## 0. 菴咲ｽｮ縺･縺・
- 蟇ｾ雎｡Phase: Phase3.5-1a
- 蜑肴署縺ｨ縺ｪ繧玖ｨｭ險域嶌: `docs/liner/project_file_format.md`, `docs/liner/schema_migration_policy.md`, `docs/liner/domain_model.md`, `docs/liner/phase3.5-0_investigation_report.md`
- 縺薙・險ｭ險域嶌縺ｧ謇ｱ縺・ｯ・峇: Phase3.5縺ｧ蠢・井ｿ晏ｭ倥☆繧詰iner domain draft縺ｮ蝙九」ersion邂｡逅・」0.1蝗ｺ螳啝/offset Draft縺九ｉ縺ｮmigration縲∝ｾ梧婿莠呈鋤蠅・阜縲・- 縺薙・險ｭ險域嶌縺ｧ謇ｱ繧上↑縺・ｯ・峇: 螳滄圀縺ｮ `schemas/*.json` 螟画峩縲ゝS蝙句ｮ夂ｾｩ縺ｮ螳溯｣・：rame Model縺ｮ `nodes/members` schema螟画峩縲・
## 1. 閭梧勹縺ｨ逶ｮ逧・
Phase3.5-0隱ｿ譟ｻ縺ｧ縲∫樟迥ｶ縺ｮ `project.liner.draft` 縺ｯ `schemas/project.schema.json` 荳・`additionalProperties: true` 縺ｮ閾ｪ逕ｱ蠖｢蠑上〒縺ゅｊ縲∵峇邱壹・邵ｦ譁ｭ繝ｻ讓ｪ譁ｭ繧貞ｮ牙ｮ壻ｿ晏ｭ倥☆繧九↓縺ｯ蝙倶ｻ倥″schema縺御ｸ崎ｶｳ縺励※縺・ｋ縺薙→縺悟愛譏弱＠縺溘・
Phase3.5縺ｧ縺ｯ縲∝ｮ溯｣・ｒ蟋九ａ繧句燕縺ｫdomain draft繧呈ｭ｣蠑上↑菫晏ｭ伜ｯｾ雎｡縺ｨ縺励※螳夂ｾｩ縺吶ｋ縲よｰｴ蟷ｳ譖ｲ邱壹∫ｸｦ譁ｭ縲∵ｨｪ譁ｭ縲・D邨ｱ蜷医・xport縺ｯ縺吶∋縺ｦ縺薙・Typed Draft Schema vNext繧貞燕謠舌↓縺吶ｋ縲・
## 2. 逕ｨ隱槫ｮ夂ｾｩ

| 逕ｨ隱・| 螳夂ｾｩ |
|---|---|
| Integration metadata | 譌｢蟄・`liner.schemaVersion = "0.1.0"` 縺ｧ邂｡逅・☆繧・`sourceRevision`, `linerModelId`, `intermediateSchemaVersion` 縺ｪ縺ｩ縺ｮ逕滓・繝｡繧ｿ繝・・繧ｿ縲・|
| Domain draft | 繝ｦ繝ｼ繧ｶ繝ｼ縺檎ｷｨ髮・☆繧狗ｷ壼ｽ｢domain蜈･蜉帙１hase3.5莉･髯阪・ `liner.domainDraft` 縺ｨ縺励※蠢・井ｿ晏ｭ倥☆繧九・|
| `draftSchemaVersion` | Domain draft蟆ら畑version縲よ里蟄・`liner.schemaVersion` 縺ｨ縺ｯ蛻･邂｡逅・・|
| v0.1 fixed-z draft | 迴ｾ陦・`BuildIntermediateInput` 逶ｸ蠖薙・ `alignment / stationDefinition / offsets / sampleInterval / z` 縺縺代ｒ謖√▽Draft縲・|
| Discriminated union | `type` field縺ｧ `straight / arc / clothoid` 遲峨ｒ蛹ｺ蛻･縺吶ｋ蝙倶ｻ倥″讒矩縲・|

## 3. 遒ｺ螳壽婿驥晢ｼ・uman Decision蜿肴丐・・
- Decision #4: v0.1蝗ｺ螳啝/offset Draft縺ｮ縺ｿ髱樒ｴ螢確igration蟇ｾ雎｡縲り・逕ｱ蠖｢蠑愁raft縺ｮ螳悟・莠呈鋤縺ｯ蟇ｾ雎｡螟悶・- Decision #5: Project菫晏ｭ倥〒縺ｯdomain draft繧貞ｿ・井ｿ晏ｭ倥＠縲～liner.draftSchemaVersion` 縺ｧ邂｡逅・☆繧九・- Decision #8: Phase3.5縺ｧ縺ｯ蜊倅ｸalignment繧堤ｶ咏ｶ壹☆繧九り､・焚alignment縺ｯ蟆・擂Phase縲・- Decision #9: 陦ｨ遉ｺ逕ｨ縲．XF逕ｨ縲：rame蛻・牡逕ｨsampling繧貞・髮｢縺励‥omain draft蜀・〒蛻･險ｭ螳壹→縺励※菫晏ｭ倥☆繧九・
## 4. 繝峨Γ繧､繝ｳ繝｢繝・Ν

逍台ｼｼTS:

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

荳ｻ隕’ield:

| 蜷榊燕 | 蝙・| 蠢・・| 蛻ｶ邏・| 隱ｬ譏・|
|---|---|---:|---|---|
| `liner.draftSchemaVersion` | string | Yes | `"0.2.0"` | Domain draft縺ｮversion縲・|
| `liner.domainDraft` | object | Yes | vNext schema貅匁侠 | 菫晏ｭ伜ｿ・医・邱ｨ髮・omain縲・|
| `alignment` | object | Yes | 蜊倅ｸalignment | 豌ｴ蟷ｳ邱壼ｽ｢縲・|
| `alignment.elements[]` | union | Yes | `straight/arc/clothoid` | 豌ｴ蟷ｳ隕∫ｴ縲・|
| `verticalAlignment.elements[]` | union | Yes | `grade/parabolic` | 邵ｦ譁ｭ隕∫ｴ縲ょ崋螳啝 migration譎ゅ・1譛ｬ縺ｮgrade縺ｫ螟画鋤縲・|
| `crossSections[]` | array | Yes | 1莉ｶ莉･荳・| 讓ｪ譁ｭ繝・Φ繝励Ξ繝ｼ繝医ょ崋螳嗤ffset migration譎ゅ・default template繧堤函謌舌・|
| `gridDefinitions[]` | array | Yes | 1莉ｶ莉･荳・| station遽・峇縲∵ｨｪ譁ｭ蜿ら・縲：rame蛻・牡險ｭ螳壹・|
| `sampling.display` | object | Yes | spacing/error | Preview逕ｨ縲・|
| `sampling.dxf` | object | Yes | spacing/error | DXF polyline霑台ｼｼ逕ｨ縲・|
| `sampling.frame` | object | Yes | spacing/error | Frame邏ｰ蛻・喧member逕ｨ縲・|

豌ｴ蟷ｳ隕∫ｴunion:

```ts
type HorizontalElementDraft =
  | { type: "straight"; id: string; start: Vec2; azimuth: number; length: number }
  | { type: "arc"; id: string; start: Vec2; azimuth: number; radius: number; turn: "left" | "right"; length: number }
  | { type: "clothoid"; id: string; start: Vec2; azimuth: number; clothoidParameter: number; startRadius?: number | null; endRadius?: number | null; turn: "left" | "right"; length: number };
```

Sampling險ｭ螳・

```ts
interface SamplingSettingsDraft {
  display: { maxChordLength: number; maxSagitta: number; minSegmentsPerElement: number };
  dxf: { maxChordLength: number; maxSagitta: number; minSegmentsPerElement: number };
  frame: { maxMemberLength: number; maxSagitta: number; stationIntervalFallback: number };
}
```

## 5. 繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝 / 險育ｮ苓ｦ丞援

Migration蛻､螳・

1. `project.liner.draftSchemaVersion === "0.2.0"` 縺九▽ `domainDraft` 縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・vNext縺ｨ縺励※隱ｭ繧縲・2. `project.liner.draft` 縺悟ｭ伜惠縺励～alignment/stationDefinition/offsets/z` 縺ｮ縺ｿ縺ｧ讒区・縺輔ｌ繧句ｴ蜷医・v0.1 fixed-z draft縺ｨ縺励※migration縺吶ｋ縲・3. 閾ｪ逕ｱ蠖｢蠑愁raft縲∵悴遏･field萓晏ｭ魯raft縲∬､・焚alignment鬚ｨDraft縺ｯ閾ｪ蜍瀕igration蟇ｾ雎｡螟悶６I縺ｯ隱ｭ縺ｿ霎ｼ縺ｿ荳榊庄險ｺ譁ｭ繧貞・縺励∵眠隕丈ｽ懈・縺ｾ縺溘・謇句虚蜀榊・蜉帙ｒ菫・☆縲・
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

譌｢螳嘖ampling:

| 邉ｻ邨ｱ | 譌｢螳壼､ | 險ｱ螳ｹ隱､蟾ｮ |
|---|---:|---:|
| display | max chord 0.5 m | max sagitta 0.005 m |
| dxf | max chord 0.1 m | max sagitta 0.001 m |
| frame | max chord 0.25 m | max sagitta 0.0025 m |

## 6. UI莉墓ｧ・
驟咲ｽｮ蝣ｴ謇:

- `liner.setup` 繧偵ち繝門・蜑ｲ縺励√Λ繧､繝ｳ / 貂ｬ轤ｹ / 鬮倥＆ / 邵ｦ譁ｭ / 讓ｪ譁ｭ / 遒ｺ隱榊峙繧呈署萓帙☆繧九・- Draft version繧・igration迥ｶ諷九・遒ｺ隱榊峙繧ｿ繝悶∪縺溘・繝倥ャ繝縺ｮ險ｺ譁ｭ鬆伜沺縺ｫ陦ｨ遉ｺ縺吶ｋ縲・
蜈･蜉嫻ield:

| 繧ｿ繝・| 荳ｻ縺ｪfield |
|---|---|
| 繝ｩ繧､繝ｳ | alignment id, element type, start, azimuth, length, radius, turn, clothoidParameter |
| 貂ｬ轤ｹ | originDisplayedStation, interval, explicitStations, equations |
| 鬮倥＆ | base elevation, height points |
| 邵ｦ譁ｭ | grade segments, PVI/PVC/PVT, parabolic length |
| 讓ｪ譁ｭ | offsets, lane widths, crossfall, structural offsets |
| 遒ｺ隱榊峙 | display/dxf/frame sampling read-only summary and diagnostics |

Validation縺ｯfield blur縺ｧ螻謇險ｺ譁ｭ縲∽ｿ晏ｭ・Preview/Frame逕滓・譎ゅ↓full draft validation繧貞ｮ溯｡後☆繧九・
## 7. Pipeline邨ｱ蜷・
`buildIntermediateResult()` 縺ｮ蜈･蜉帙・vNext縺ｧ縺ｯ `LinerDomainDraftVNext` 縺ｫ縺ｪ繧九よ里蟄・`BuildIntermediateInput` 縺ｯmigration蠕後・蜀・Κ莠呈鋤蜈･蜉帙→縺励※縺ｮ縺ｿ謇ｱ縺・・
蟾ｮ蛻・

- `sourceRevisionFor()` 縺ｯ `draftSchemaVersion` 縺ｨ `domainDraft` 蜈ｨ菴薙ｒcanonicalize縺吶ｋ縲・- `buildHorizontalResult()` 縺ｯ `domainDraft.alignment` 繧定ｪｭ繧縲・- `buildVerticalResult()` 縺ｯ `domainDraft.verticalAlignment` 繧定ｪｭ繧縲・- `generateGridPoints()` 縺ｯ `gridDefinitions` 縺ｨ `crossSections` 繧定ｪｭ繧縲・- Export/Viewer縺ｯdomain draft繧堤峩謗･隱ｭ縺ｾ縺壹（ntermediate縺縺代ｒ隱ｭ繧縲・
## 8. Validation / Diagnostics

| 繝ｫ繝ｼ繝ｫ | Level | Code |
|---|---|---|
| `draftSchemaVersion` 譛ｪ蟇ｾ蠢・| error | `LINER_SCHEMA_INVALID` |
| `domainDraft` 谺關ｽ | error | `LINER_SCHEMA_INVALID` |
| v0.1 fixed-z migration荳崎・ | error | `LINER_SCHEMA_INVALID` |
| 閾ｪ逕ｱ蠖｢蠑愁raft繧呈､懷・ | error | `LINER_SCHEMA_INVALID` |
| alignment隕∫ｴunion荳肴ｭ｣ | error | `LINER_SCHEMA_INVALID` |
| sampling險ｭ螳壹′0莉･荳・| error | `LINER_GRID_SPACING_INVALID` |

## 9. 繝・せ繝域婿驥・
- `linerDomainDraftMigration.test.ts`: v0.1 fixed-z draft繧致Next縺ｸ螟画鋤縺吶ｋ縲・- `linerDomainDraftSchema.test.ts`: discriminated union縺ｮvalid/invalid繧呈､懆ｨｼ縺吶ｋ縲・- `projectLinerDraft.test.ts`: `liner.domainDraft` 蠢・井ｿ晏ｭ倥→譌ｧ `liner.draft` fallback繧呈､懆ｨｼ縺吶ｋ縲・- Golden譛蟆上そ繝・ヨ: straight fixed-z migration縲∥rc蜈･繧革Next draft縲」ertical/crossSection蜈･繧革Next draft縲・
## 10. Migration / 蠕梧婿莠呈鋤

- 髱樒ｴ螢確igration: 蜈パroject object縺ｯ螟画峩縺帙★縲∬ｪｭ縺ｿ霎ｼ縺ｿ譎ゅ↓vNext view model繧堤函謌舌☆繧九・- 菫晏ｭ俶凾: vNext縺ｨ縺励※ `liner.draftSchemaVersion` 縺ｨ `liner.domainDraft` 繧呈嶌縺上・- 譌ｧ `liner.draft` 縺ｯ隱ｭ縺ｿ霎ｼ縺ｿfallback縺ｨ縺励※縺ｮ縺ｿ謇ｱ縺・よ眠隕丈ｿ晏ｭ倥〒縺ｯ譖ｸ縺九↑縺・・- 閾ｪ逕ｱ蠖｢蠑愁raft縺ｯ蟇ｾ雎｡螟悶Ａ<!-- TBD: Human Decision required if full arbitrary draft compatibility becomes required -->`

## 11. 繧ｪ繝ｼ繝励Φ隱ｲ鬘・/ 蟆・擂諡｡蠑ｵ

- 隍・焚alignment蟇ｾ蠢懊・- Standalone `.liner-project.json` schema縺ｮ豁｣蠑丞喧縲・- `schemas/liner-project.schema.json` 蛻・屬縲・- domain draft縺ｮ蝨ｧ邵ｮ/螟夜Κ繝輔ぃ繧､繝ｫ蛹悶・
## 12. 蜿ら・

- 蜑肴署: `docs/liner/phase3.5-0_investigation_report.md`, `docs/liner/project_file_format.md`, `docs/liner/schema_migration_policy.md`
- 蜿ら・縺輔ｌ繧玖ｨｭ險域嶌: `horizontal_curve_completion.md`, `vertical_alignment_design.md`, `cross_section_superelevation_design.md`, `coordinate_integration_3d_design.md`, `dxf_stl_curve_export_strategy.md`, `implementation_priority_and_pr_breakdown.md`
- 髢｢騾｣繧ｳ繝ｼ繝・ `frontend/src/liner/schema/types.ts`, `frontend/src/liner/schema/projectLinerMigration.ts`, `frontend/src/liner/adapters/linerProjectDraft.ts`, `schemas/project.schema.json`
- 髢｢騾｣繝・せ繝・ `frontend/src/liner/schema/__tests__/projectLinerExtension.test.ts`, `frontend/src/liner/adapters/linerProjectDraft.test.ts`

### Phase3.5-0.6 draftSchemaVersion Decision

Decision addendum: use `liner.draftSchemaVersion`, not `liner.domainSchemaVersion`.
Reason: the name states that this version belongs to the Draft payload and distinguishes it from `liner.schemaVersion`, which is integration metadata.

Project save example:

```json
{
  "liner": {
    "schemaVersion": "0.1.0",
    "draftSchemaVersion": "0.2.0",
    "linerModelId": "...",
    "domainDraft": {}
  }
}
```

### Round-trip Test Policy (Required)

All save/load paths must verify the following round-trip consistency.

1. Forward migration round-trip:
   Load v0.1 draft -> migrate to vNext -> save -> reload -> deep equal with the first migration result.
2. Editing round-trip:
   Edit vNext draft -> save -> reload -> deep equal with the edited state.
3. Idempotency:
   Migrate v0.1 -> save -> reload -> re-save -> reload -> deep equal with the first migration result.

These checks are part of PR-1a-5 Done conditions. Missing checks block merge.
