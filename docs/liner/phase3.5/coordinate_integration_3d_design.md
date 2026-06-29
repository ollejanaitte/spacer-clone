# 3D Coordinate Integration Design

## 0. 位置づけ

- 対象Phase: Phase3.5-4
- 前提となる設計書: `typed_liner_draft_schema_vnext.md`, `horizontal_curve_completion.md`, `vertical_alignment_design.md`, `cross_section_superelevation_design.md`
- この設計書で扱う範囲: 水平+縦断+横断からの3D座標統合、`zProvenance`, grid/spans/piers/sections, trace, localFrame反映, Frame Model分割
- この設計書で扱わない範囲: DXF/STL出力format詳細

## 1. 背景と目的

現状pipelineは水平線形、測点、固定Z、offset配列からgridを作る。`spans/piers/sections` は型だけが存在し空配列である。Phase3.5-4では、水平曲線・縦断・横断の結果を統合し、Viewer/Frame Model/Exportが共有する3D中間結果を完成させる。

## 2. 用語定義

| 用語 | 定義 |
|---|---|
| 3D combiner | Horizontal, Vertical, CrossSectionを合成してGridPointResultを作るstage。 |
| Frame分割 | 曲線を真の曲線memberではなく、細分化された直線member群にする処理。 |
| SectionSlice | station断面の幅員と左右edge Zを表す中間結果。 |
| Pier line | station位置とskewから生成される橋脚/横桁line。 |
| Trace | generated frame entityとliner source gridを結ぶ `linerTrace`。 |

## 3. 確定方針（Human Decision反映）

- Decision #6: Frame Modelでは曲線を細分化直線memberとして正式化し、真の曲線member概念は採用しない。
- Decision #7: superelevationのlocalFrame反映は3.5-4で行う。
- Decision #8: Phase3.5では単一alignment継続。
- Decision #9: 表示用/DXF用/Frame分割用samplingの3系統を合流要件付きで使い分ける。

## 4. ドメインモデル

```ts
interface GridPoint3DResult {
  id: string;
  station: number;
  offset: number;
  position: Vec3;
  localFrame: LocalFrame;
  zProvenance: ZProvenance;
  source: GridPointSource;
}

interface FrameMappingHint {
  generatedNodeId: string;
  generatedMemberId?: string;
  sourceGridPointId?: string;
  sourceElementId?: string;
}
```

| 名前 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `position` | Vec3 | Yes | XYはhorizontal、Zはprofile/crossfall合成。 |
| `localFrame` | LocalFrame | Yes | tangent/normal/binormal。 |
| `zProvenance` | object | Yes | Z合成内訳。 |
| `source` | object | Yes | station, offset, elementIdなどの由来。 |
| `FrameMappingHint` | object | No | Frame Model生成時のtrace候補。 |

## 5. アルゴリズム / 計算要件

3D合成:

```text
H(s) = horizontal.evaluate(s)
N(s) = horizontal.localNormal(s)
Pxy = H.xy + offset * N.xy
Z = profileZ(s) + crossfallOffset(s, offset) + structural offsets
P = (Pxy.x, Pxy.y, Z)
```

localFrame:

- tangentは水平線形の接線を基準にする。
- normalは左正offset方向。
- binormalはZ上向きを基準にする。
- superelevation反映時はnormal/binormalを横断勾配に応じて回転する。ただしPhase3.5-4の実装Gateで検証する。

Frame分割:

- frame sampling profileを使用する。
- max chord 0.25 m / sagitta <= 0.0025 mを厳守する。
- 生成memberは直線memberのみ。
- traceで元のalignment element / station range / grid pointを参照できるようにする。

## 6. UI仕様

- 確認図/3D previewではdisplay samplingを使う。
- Frame Model反映前に「生成予定node/member数」「最大member長」「sampling profile」を表示する。
- 3D統合エラーは確認図とtable diagnosticsの両方に出す。

## 7. Pipeline統合

vNext stage order:

```text
1. validateDomainDraft
2. resolveHorizontalAlignment
3. generateStationTable
4. resolveVertical
5. resolveCrossSection
6. combine3DCoordinates
7. generateSpansAndPiers
8. buildSections
9. buildFrameHints
10. buildDependencySnapshot
11. assembleIntermediateResult
12. mapToFrameModel [user action only]
```

## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| no horizontal sample for station | error | `LINER_PROFILE_COVERAGE_GAP` |
| no vertical coverage | error | `LINER_PROFILE_COVERAGE_GAP` |
| no cross-section template | error | `LINER_SCHEMA_INVALID` |
| non-finite 3D coordinate | error | `LINER_SCHEMA_INVALID` |
| frame member count high | warning | `LINER_EXPORT_POINT_COUNT_HIGH` |

## 9. テスト方針

- Unit: 3D合成、localFrame、zProvenance。
- Golden: GC-13 curved 3D integration。
- Frame: 曲線が直線member列へ分割され、最大member長を満たすこと。
- Trace: generated node/memberからsource gridへ辿れること。

## 10. Migration / 後方互換

- 既存固定Z/offset draftはN2/N3/N4でdomain化してから3D統合する。
- 既存ProjectModelへの直接mutationは行わず、mapper user actionでのみFrame Modelへ反映する。
