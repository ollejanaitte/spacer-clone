# Cross Section and Superelevation Design

## 0. 位置づけ

- 対象Phase: Phase3.5-3
- 前提となる設計書: `typed_liner_draft_schema_vnext.md`, `vertical_alignment_design.md`, `docs/liner/profile_rules.md`
- この設計書で扱う範囲: 幅員、左右offset、横断勾配、cross-section template、Z合成、符号規約
- この設計書で扱わない範囲: localFrameへのsuperelevation回転反映（Phase3.5-4）、DXF/STL出力

## 1. 背景と目的

現状のgrid生成は `offsets: number[]` と固定 `z` のみを使い、`zProvenance.crossfallOffset`, `structuralReferenceOffset`, `sectionDepthOffset`, `girderEccentricity` はすべて0である。Phase3.5-3では横断線形をdomainとして保存し、grid点ごとのZ合成を実値化する。

## 2. 用語定義

| 用語 | 定義 |
|---|---|
| Offset | alignment接線に対する左正の横断距離。 |
| Crossfall | 横断勾配。左上がりを正とする。 |
| Superelevation | 曲線部で横断勾配を変化させる設定。Phase3.5-3ではZ合成のみ、localFrame回転は3.5-4。 |
| Cross-section template | 幅員、offset line、構造基準offset、桁中心を束ねるtemplate。 |
| `zProvenance` | Grid point Zを構成する内訳。 |

## 3. 確定方針（Human Decision反映）

- Decision #3: UIは「横断」タブを持つ。
- Decision #5: 横断domainは `liner.domainDraft` に必須保存する。
- Decision #7: 横断勾配・superelevationの符号は3.5-3で確定し、localFrame反映は3.5-4へ持ち越す。
- Decision #9: Frame分割用samplingとは別に横断offset/templateを保存する。

## 4. ドメインモデル

```ts
interface CrossSectionTemplateDraft {
  id: string;
  name: string;
  offsetLines: OffsetLineDraft[];
  crossfallRules: CrossfallRuleDraft[];
  structuralReferenceOffset?: number;
}

interface OffsetLineDraft {
  id: string;
  offset: number;
  label?: string;
}

interface CrossfallRuleDraft {
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  crossfall: number;
}
```

| 名前 | 型 | 必須 | 制約 | 説明 |
|---|---|---:|---|---|
| `offsetLines[].offset` | number | Yes | finite | 左正offset。 |
| `crossfallRules[].crossfall` | number | Yes | finite | dZ/doffset。左上がり正。 |
| `startPhysicalDistance/endPhysicalDistance` | number | Yes | alignment内 | 適用範囲。 |
| `structuralReferenceOffset` | number | No | finite | 構造基準線offset。 |

## 5. アルゴリズム / 計算要件

横断Z合成:

```text
crossfallOffset = crossfall(s) * offset
z = profileZ(s) + crossfallOffset + structuralReferenceOffset + sectionDepthOffset + girderEccentricity
```

符号規約:

- offsetはalignment左側を正とする。
- crossfallは左側が上がる場合を正とする。
- `crossfallOffset = crossfall(s) * offset` とする。
- superelevationはcrossfall ruleの時間変化・station変化として扱い、Phase3.5-3ではlocalFrameを回転しない。

`zProvenance`:

```ts
interface ZProvenance {
  profileZ: number;
  crossfallOffset: number;
  structuralReferenceOffset: number;
  sectionDepthOffset: number;
  girderEccentricity: number;
}
```

## 6. UI仕様

- 配置: 「横断」タブ。
- template一覧: `id`, `name`, `structuralReferenceOffset`。
- offset line表: `label`, `offset`。
- crossfall rule表: `start`, `end`, `crossfall`。
- 確認図: offset lineとcrossfall方向を表示する。

## 7. Pipeline統合

- Stage: `resolveCrossSection(crossSections, gridDefinitions)`。
- Stage: `combine3DCoordinates(horizontal, stations, vertical, crossSection)`。
- Grid pointごとに `profileZ`, `crossfallOffset`, `zProvenance` を保存する。

## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| duplicate offset within tolerance | error | `LINER_GRID_SPACING_INVALID` |
| non-finite crossfall | error | `LINER_SCHEMA_INVALID` |
| overlapping station ranges | error | `LINER_PROFILE_OVERLAP` |
| gridDefinition references missing template | error | `LINER_SCHEMA_INVALID` |
| no crossfall coverage | warning | `LINER_PROFILE_COVERAGE_GAP` |

## 9. テスト方針

- Unit: `crossfallOffset = crossfall * offset`。
- Boundary: offset 0、左右符号、range overlap。
- Golden: GC-12 crossfall Z provenance。
- Pipeline: grid pointsにZ内訳が保存されること。

## 10. Migration / 後方互換

- 既存 `offsets` はdefault cross-section templateの `offsetLines` に移行する。
- 既存固定Zはvertical migration側でgrade=0へ移行する。
- crossfall未指定の場合は0として扱うが、domain draftにはdefault ruleを保存する。
