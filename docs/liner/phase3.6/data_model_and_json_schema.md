# Phase 3.6 Data Model and JSON Schema

## 0. 方針

本書は Phase 3.6 importer JSON の仕様文書である。実 JSON Schema ファイルは作成しない。

階層は `Project -> Bridge -> Spans -> Sections -> Points` を基本とし、PDF 写経値の保存、未定義値の保持、sourceRef による追跡、Phase 3.5 vNext draft への片方向変換を支える。

## 1. ルート構造

```ts
interface JipLinerImporterProject {
  liner: {
    importerSchemaVersion: "0.1.0";
  };
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  coordinateSystem: CoordinateSystem;
  bridges: Bridge[];
}
```

## 2. 主要型

```ts
interface CoordinateSystem {
  horizontal: {
    datum: string;
    epoch?: string | null;
    zone?: number | null;
    unit: "m";
    notes?: string;
  };
  vertical: {
    heightDatum: string;
    geoidModel?: string | null;
    unit: "m";
    notes?: string;
  };
}

interface Bridge {
  id: string;
  name: string;
  routeName?: string;
  bridgeType?: "simple" | "continuous" | "integrated" | "separated" | "custom";
  girderLineSets: GirderLineSet[];
  spans: Span[];
  sections: Section[];
  alignmentMetadata?: AlignmentMetadata;
}

interface Span {
  id: string;
  name: string;
  startStation?: number | null;
  endStation?: number | null;
  girderLineSetId?: string | null;
  sourceRef?: SourceRef;
}

interface GirderLineSet {
  id: string;
  name: string;
  referenceMode: "centerline-offset" | "absolute-coordinate" | "pdf-row-master";
  appliesToSpanIds: string[];
  lines: GirderLineMaster[];
}

interface GirderLineMaster {
  id: string;
  label: string;
  role?: "center" | "girder" | "edge" | "barrier" | "custom";
  displayOrder: number;
  nominalOffset?: number | null;
}
```

## 3. Section / Point

```ts
interface Section {
  id: string;
  bridgeId: string;
  pdfPage: number;
  sectionNo?: string;
  title?: string;
  azimuth: AngleValue;
  stationingRef: StationingRef;
  points: Point[];
  diagnostics?: DiagnosticSummary;
  sourceRef: SourceRef;
}

interface StationingRef {
  stationLabel?: string | null;
  stationValue?: number | null;
  cumulativeDistance?: number | null;
  notation?: string | null;
  sourceRef?: SourceRef;
}

interface Point {
  id: string;
  girderLineId: string;
  lineLabel: string;
  x: NullableNumberValue;
  y: NullableNumberValue;
  designElevation: NullableNumberValue;
  crossSlope: NullableNumberValue;
  unitDistance: NullableNumberValue;
  cumulativeDistance: NullableNumberValue;
  unitWidth: NullableNumberValue;
  cumulativeWidth: NullableNumberValue;
  intersectionAngle?: NullableAngleValue;
  station?: NullableStationValue;
  flags: Flags;
  sourceRef: SourceRef;
}
```

## 4. 値型

```ts
interface Angle {
  deg: number;
  min: number;
  sec: number;
  decimalDeg: number;
  notation: string;
}

type AngleValue = {
  value: Angle | null;
  flags: Flags;
  sourceRef: SourceRef;
};

type NullableAngleValue = AngleValue;

interface NullableNumberValue {
  value: number | null;
  notation?: string | null;
  unit?: "m" | "%" | "deg";
  flags: Flags;
  sourceRef: SourceRef;
}

interface NullableStationValue {
  value: number | null;
  label?: string | null;
  notation?: string | null;
  flags: Flags;
  sourceRef: SourceRef;
}

interface Flags {
  notComputed?: boolean;
  notApplicable?: boolean;
  outOfRange?: boolean;
}

interface SourceRef {
  pdfPage: number;
  row?: number | null;
  col?: number | null;
  field?: string;
  enteredAt: string;
  enteredBy?: string | null;
}
```

`********` は以下で保持する。

```json
{
  "value": null,
  "notation": "********",
  "flags": { "notComputed": true }
}
```

## 5. AlignmentMetadata

補助入力は Phase 3.5 vNext draft と同型に寄せる。完全な計算再現に使える場合は adapter が優先的に使用する。

```ts
interface AlignmentMetadata {
  plan?: HorizontalAlignmentDraftLike;
  profile?: VerticalAlignmentDraftLike;
  crossSlope?: CrossSlopeDraftLike;
  notes?: string;
  sourceRef?: SourceRef;
}

type HorizontalAlignmentDraftLike = {
  elements: Array<
    | { type: "straight"; id: string; start: { x: number; y: number }; azimuth: number; length: number }
    | { type: "arc"; id: string; start: { x: number; y: number }; azimuth: number; radius: number; turn: "left" | "right"; length: number }
    | { type: "clothoid"; id: string; start: { x: number; y: number }; azimuth: number; clothoidParameter: number; startRadius?: number | null; endRadius?: number | null; turn: "left" | "right"; length: number }
  >;
};

type VerticalAlignmentDraftLike = {
  elements: Array<
    | { type: "grade"; id: string; startStation: number; endStation: number; startElevation: number; grade: number }
    | { type: "parabolic"; id: string; startStation: number; endStation: number; startGrade: number; endGrade: number; length: number; startElevation?: number; curveType?: "crest" | "sag" }
  >;
};

type CrossSlopeDraftLike = {
  definitions: Array<{ id: string; station: number; crossSlope: number; source?: string }>;
};
```

## 6. サンプル JSON

サンプルの根拠 PDF は `REPORT09_2編-01_Hランプ4号橋_線形計算書.PDF` とする。この PDF の 12 ページ目以降にユーザーが読み取る入力データがあり、§3.1 大座標の「横断面 1 : PH12(PE10)」を 1 section 分の例として転記する。

```json
{
  "liner": { "importerSchemaVersion": "0.1.0" },
  "id": "project-h-ramp-no4-preliminary",
  "name": "Hランプ4号橋 JIP-LINER PDF 入力",
  "createdAt": "2026-07-02T00:00:00+09:00",
  "updatedAt": "2026-07-02T00:00:00+09:00",
  "coordinateSystem": {
    "horizontal": { "datum": "JGD2011", "epoch": null, "zone": null, "unit": "m" },
    "vertical": { "heightDatum": "T.P.", "geoidModel": null, "unit": "m" }
  },
  "bridges": [
    {
      "id": "bridge-h-ramp-4",
      "name": "Hランプ4号橋",
      "bridgeType": "continuous",
      "girderLineSets": [
        {
          "id": "gls-main",
          "name": "主桁線セット",
          "referenceMode": "pdf-row-master",
          "appliesToSpanIds": ["span-1"],
          "lines": [
            { "id": "hl1", "label": "HL1", "role": "edge", "displayOrder": 0 },
            { "id": "g1", "label": "G1", "role": "girder", "displayOrder": 3 },
            { "id": "hcl", "label": "HCL", "role": "center", "displayOrder": 4 },
            { "id": "g2", "label": "G2", "role": "girder", "displayOrder": 5 },
            { "id": "cl", "label": "CL", "role": "custom", "displayOrder": 8 }
          ]
        }
      ],
      "spans": [{ "id": "span-1", "name": "PH12-PH15", "girderLineSetId": "gls-main" }],
      "sections": [
        {
          "id": "section-001-ph12-pe10",
          "bridgeId": "bridge-h-ramp-4",
          "pdfPage": 23,
          "sectionNo": "横断面 1",
          "title": "PH12(PE10)",
          "azimuth": {
            "value": { "deg": 109, "min": 58, "sec": 28.3, "decimalDeg": 109.9745278, "notation": "109-58-28.3" },
            "flags": {},
            "sourceRef": { "pdfPage": 23, "row": 1, "col": 1, "enteredAt": "2026-07-02T00:00:00+09:00" }
          },
          "stationingRef": { "stationLabel": "12+19.7133", "stationValue": 259.7133, "cumulativeDistance": null },
          "points": [
            {
              "id": "section-001-hl1",
              "girderLineId": "hl1",
              "lineLabel": "HL1",
              "x": { "value": -105476.6593, "notation": "-105476.6593", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 1, "col": 2, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "y": { "value": -24333.7790, "notation": "-24333.7790", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 1, "col": 3, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "designElevation": { "value": 17.8144, "notation": "17.8144", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 1, "col": 4, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "crossSlope": { "value": 2.0, "notation": "2.0000", "unit": "%", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 1, "col": 5, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "unitDistance": { "value": null, "notation": "*********", "unit": "m", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 1, "col": 6, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "cumulativeDistance": { "value": null, "notation": "*********", "unit": "m", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 1, "col": 7, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "unitWidth": { "value": 0.4450, "notation": "0.4450", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 2, "col": 8, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "cumulativeWidth": { "value": 7.5707, "notation": "7.5707", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 1, "col": 9, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "intersectionAngle": { "value": { "deg": 90, "min": 45, "sec": 49, "decimalDeg": 90.7636111, "notation": "90-45-49" }, "flags": {}, "sourceRef": { "pdfPage": 23, "row": 1, "col": 10, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "station": { "value": 259.8142, "label": "12+19.8142", "notation": "12+19.8142", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 1, "col": 11, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "flags": {},
              "sourceRef": { "pdfPage": 23, "row": 1, "enteredAt": "2026-07-02T00:00:00+09:00" }
            },
            {
              "id": "section-001-hcl",
              "girderLineId": "hcl",
              "lineLabel": "HCL",
              "x": { "value": -105474.0732, "notation": "-105474.0732", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 5, "col": 2, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "y": { "value": -24340.8943, "notation": "-24340.8943", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 5, "col": 3, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "designElevation": { "value": 17.6595, "notation": "17.6595", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 5, "col": 4, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "crossSlope": { "value": 0.0, "notation": "0.0000", "unit": "%", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 5, "col": 5, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "unitDistance": { "value": null, "notation": "*********", "unit": "m", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 5, "col": 6, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "cumulativeDistance": { "value": null, "notation": "*********", "unit": "m", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 5, "col": 7, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "unitWidth": { "value": 0.5473, "notation": "0.5473", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 6, "col": 8, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "cumulativeWidth": { "value": 0.0, "notation": "0.0000", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 5, "col": 9, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "intersectionAngle": { "value": { "deg": 90, "min": 46, "sec": 10, "decimalDeg": 90.7694444, "notation": "90-46-10" }, "flags": {}, "sourceRef": { "pdfPage": 23, "row": 5, "col": 10, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "station": { "value": 259.7133, "label": "12+19.7133", "notation": "12+19.7133", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 5, "col": 11, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "flags": {},
              "sourceRef": { "pdfPage": 23, "row": 5, "enteredAt": "2026-07-02T00:00:00+09:00" }
            },
            {
              "id": "section-001-cl",
              "girderLineId": "cl",
              "lineLabel": "CL",
              "x": { "value": -105472.4036, "notation": "-105472.4036", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 9, "col": 2, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "y": { "value": -24345.4878, "notation": "-24345.4878", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 9, "col": 3, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "designElevation": { "value": null, "notation": "*********", "unit": "m", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 9, "col": 4, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "crossSlope": { "value": null, "notation": "********", "unit": "%", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 9, "col": 5, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "unitDistance": { "value": null, "notation": "*********", "unit": "m", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 9, "col": 6, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "cumulativeDistance": { "value": null, "notation": "*********", "unit": "m", "flags": { "notComputed": true }, "sourceRef": { "pdfPage": 23, "row": 9, "col": 7, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "unitWidth": { "value": 3.6805, "notation": "3.6805", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 10, "col": 8, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "cumulativeWidth": { "value": -4.8875, "notation": "-4.8875", "unit": "m", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 9, "col": 9, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "intersectionAngle": { "value": { "deg": 90, "min": 0, "sec": 0, "decimalDeg": 90.0, "notation": "90-00-00" }, "flags": {}, "sourceRef": { "pdfPage": 23, "row": 9, "col": 10, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "station": { "value": 926.9277, "label": "46+06.9277", "notation": "46+06.9277", "flags": {}, "sourceRef": { "pdfPage": 23, "row": 9, "col": 11, "enteredAt": "2026-07-02T00:00:00+09:00" } },
              "flags": {},
              "sourceRef": { "pdfPage": 23, "row": 9, "enteredAt": "2026-07-02T00:00:00+09:00" }
            }
          ],
          "sourceRef": { "pdfPage": 23, "enteredAt": "2026-07-02T00:00:00+09:00" }
        }
      ]
    }
  ]
}
```

## 7. Phase 3.5 vNext 対応表

| Phase 3.6 | Phase 3.5 vNext | 備考 |
|---|---|---|
| `liner.importerSchemaVersion` | `liner.draftSchemaVersion` とは別 | 変換時に Phase 3.5 側 version を生成 |
| `coordinateSystem` | `coordinatePolicyId` / project metadata | 既存 policy へ丸める |
| `alignmentMetadata.plan` | `domainDraft.alignment` | 同型に寄せる |
| `alignmentMetadata.profile` | `domainDraft.verticalAlignment` | 同型に寄せる |
| `alignmentMetadata.crossSlope` | `domainDraft.crossSections` / crossfall data | adapter でテンプレート化 |
| `bridges[].spans` | `domainDraft.spans` | span ID を再採番可能 |
| `sections[].stationingRef` | `domainDraft.gridDefinitions` / station data | station 列の根拠 |
| `sections[].points[]` | grid / height / cross-section 相当 | 点群は検証・補完情報として保持 |
| `sourceRef` | conversion log | Phase 3.5 draft 本体には持ち込まず log に保存 |
