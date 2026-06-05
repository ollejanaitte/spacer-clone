# 帳票・図面出力設計

## 1. 目的

解析結果を帳票、図面、CSV、将来のPDF/DXF等へ展開するための責務分離を定義する。

本設計は出力アーキテクチャの定義であり、実装、UI変更、API変更、ライブラリ追加は行わない。

## 2. 基本構成

帳票・図面出力は以下の流れとする。

```text
Result
↓
Drawing Model
↓
Report Model
↓
Export
```

`Result` は [result-schema.md](result-schema.md) で定義する解析結果である。`Drawing Model` は図面化のための派生モデル、`Report Model` は帳票構成のための派生モデル、`Export` は出力形式への変換を担当する。

## 3. 責務分担

| 層 | 責務 | 例 |
| --- | --- | --- |
| Result | 解析結果の事実を保持する。 | 変位、反力、部材断面力、固有値解析結果、応答スペクトル結果、影響線結果 |
| Drawing Model | 図面上の幾何、注記、図化系列を保持する。 | 変形図、断面力図、モード図、影響線図 |
| Report Model | 帳票の章、表、図、注記を保持する。 | 結果一覧表、断面力表、固有値表、応答スペクトル表 |
| Export | 出力形式へ変換する。 | CSV、PDF、DXF、画像、印刷用データ |

## 4. Drawing Model

Drawing Modelは、解析結果から図面要素へ変換した派生モデルである。線幅、色、フォントサイズなどの出力スタイルはDrawing ModelまたはExport設定に属し、Result Schemaには含めない。

```ts
export type DrawingModel = {
  id: string;
  sourceResultId: string;
  title: string;
  drawings: DrawingItem[];
};

export type DrawingItem =
  | DeformationDrawing
  | MemberSectionForceDrawing
  | EigenModeDrawing
  | InfluenceLineDrawing;

export type DeformationDrawing = {
  type: "deformation";
  loadCaseId: string;
  nodes: Array<{
    nodeId: string;
    x: number;
    y: number;
    z: number;
    dx: number;
    dy: number;
    dz: number;
  }>;
};

export type MemberSectionForceDrawing = {
  type: "memberSectionForce";
  loadCaseId: string;
  component: "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";
  diagrams: Array<{
    memberId: string;
    points: Array<{ station: number; value: number }>;
  }>;
};

export type EigenModeDrawing = {
  type: "eigenMode";
  modeNo: number;
  nodes: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
  }>;
};

export type InfluenceLineDrawing = {
  type: "influenceLine";
  lineId: string;
  targetId: string;
  points: Array<{ station: number; value: number }>;
};
```

## 5. Report Model

Report Modelは、帳票の章立て、表、図、注記を表す派生モデルである。帳票の見た目やページ割りはReport ModelまたはExport設定で扱い、Result Schemaには含めない。

```ts
export type ReportModel = {
  id: string;
  sourceResultId: string;
  title: string;
  sections: ReportSection[];
};

export type ReportSection = {
  id: string;
  title: string;
  blocks: ReportBlock[];
};

export type ReportBlock =
  | { type: "table"; title: string; columns: string[]; rows: Array<Array<string | number>> }
  | { type: "drawing"; title: string; drawingId: string }
  | { type: "note"; text: string };
```

## 6. Export

ExportはReport ModelまたはDrawing Modelを出力形式へ変換する責務を持つ。

```ts
export type ExportRequest = {
  reportModelId?: string;
  drawingModelId?: string;
  format: "csv" | "pdf" | "dxf" | "png";
  targetSections?: string[];
};

export type ExportResult = {
  format: ExportRequest["format"];
  fileName: string;
  warnings: string[];
};
```

## 7. 出力対象

帳票・図面出力では以下を扱う。

- 節点変位
- 反力
- 部材断面力 `N`, `Qy`, `Qz`, `Mx`, `My`, `Mz`
- 固有値解析結果
- 応答スペクトル解析結果
- 影響線結果

## 8. 関連文書

- [result-schema.md](result-schema.md)
- [result-visualization.md](result-visualization.md)
- [../investigation/visualization-study.md](../investigation/visualization-study.md)
