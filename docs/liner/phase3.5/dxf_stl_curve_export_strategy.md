# DXF/STL Curve Export Strategy

## 0. 位置づけ

- 対象Phase: Phase3.5-5
- 前提となる設計書: `coordinate_integration_3d_design.md`, `horizontal_curve_completion.md`, `vertical_alignment_design.md`, `docs/liner/cad_output_spec.md`
- この設計書で扱う範囲: 曲線DXF polyline近似、profile labels、STL分割、許容誤差、ARC将来拡張条件
- この設計書で扱わない範囲: DXF ARC entity初期実装、真の曲線tube STL

## 1. 背景と目的

現状 `linerPlanDxf.ts` と `linerProfileDxf.ts` はMaker.js line pathでpolylineを出力し、`linerFrameStl.ts` はFrame memberごとに円柱を出力する。Phase3.5では円弧/クロソイド/縦断/横断に対応するが、初期DXFは全曲線polyline近似とする。

## 2. 用語定義

| 用語 | 定義 |
|---|---|
| Polyline近似 | 曲線を短い直線列で表現すること。 |
| Sagitta error | 曲線と弦の最大離れ。 |
| Plan DXF | XY平面の中心線、offset線、grid、station tick出力。 |
| Profile DXF | physical distance vs elevationの縦断図出力。 |
| STL member cylinder | Frame member端点間を円柱で出力するSTL要素。 |

## 3. 確定方針（Human Decision反映）

- Decision #1: Phase3.5初期は全曲線polyline近似。円弧ARC entityはPhase3.5-5b以降の拡張候補。
- Decision #6: STLは細分化直線memberから生成し、真の曲線tubeは採用しない。
- Decision #9: DXF用samplingは表示用/Frame用とは分離する。

## 4. ドメインモデル

```ts
interface DxfExportOptions {
  profile: "plan" | "profile";
  samplingProfile: "dxf";
  includeGrid: boolean;
  includeStations: boolean;
  includeLabels: boolean;
}

interface StlExportOptions {
  source: "frameMembers";
  radius: number;
  segmentCount: number;
}
```

## 5. アルゴリズム / 計算要件

DXF sampling:

- CAD exportはpipelineが生成した `dxf` sampling profileのsampleを消費する。
- CAD moduleはgeometry routineを直接呼ばず、ad hoc resamplingしない。
- Plan curve sagitta <= 0.001 m、max chord <= 0.1 mを既定値とする。
- Profile vertical curve chord <= 0.1 mを既定値とする。

DXF subset:

| Entity | 用途 |
|---|---|
| LINE/LWPOLYLINE | 中心線、offset線、grid線、profile線 |
| POINT | station / grid marker |
| TEXT | label |
| layer table | 種別別layer |

STL:

- Frame sampling後の直線memberを入力にする。
- 各memberを円柱近似meshに変換する。
- STL座標は3D統合後のProjectModel member端点を使用する。

## 6. UI仕様

- Export panelでPlan DXF/Profile DXF/STLを選択する。
- DXF出力前にsampling summary、点数、最大sagitta目標値を表示する。
- point countが多い場合はwarningを出すが、出力自体はユーザー確認で続行可能とする。

## 7. Pipeline統合

- `runPipeline(domainDraft, { samplingProfile: "dxf" })` の結果をDXF exportへ渡す。
- STLはFrame Model mapping後のmember列を使用する。
- 表示用sampleとDXF sampleを混用しない。

## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| dxf sampling max chord <= 0 | error | `LINER_GRID_SPACING_INVALID` |
| dxf output point count high | warning | `LINER_EXPORT_POINT_COUNT_HIGH` |
| missing dxf sampled points | error | `LINER_SCHEMA_INVALID` |
| stl radius <= 0 | error | `LINER_SCHEMA_INVALID` |

## 9. テスト方針

- Unit: DXF polyline生成、layer assignment、profile polyline。
- Golden: 円弧/クロソイドがLWPOLYLINEとして出ること。
- STL: member cylinder meshが非空で端点方向に沿うこと。
- Regression: CAD moduleがgeometry routineを直接呼ばないこと。

## 10. Migration / 後方互換

- 既存SVG MVP方針は維持する。
- DXFはPhase3.5 subsetとして追加し、JIP-LINER固有互換は狙わない。
- ARC entity対応はPhase3.5-5b以降の独立PRで扱う。
