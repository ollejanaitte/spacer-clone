# 結果スキーマ設計

## 1. 目的

ソルバが返す解析結果の共通スキーマを定義する。Result Schemaは解析結果の事実のみを保持し、表示、図化、帳票、UI操作に依存する状態は保持しない。

本設計はスキーマ設計書であり、実装、API変更、スキーマ実装は行わない。

## 2. 基本構成

Result Schemaは以下の関係で使用する。

```text
Solver
↓
Result Schema
↓
ViewModel

Report Model

Drawing Model
```

`ViewModel` は [result-visualization.md](result-visualization.md)、`Report Model` と `Drawing Model` は [report-drawing-output.md](report-drawing-output.md) で定義する。

## 3. Result Schemaに含めないもの

Result Schemaには以下を含めない。

- 表示倍率
- 表示色
- 線幅
- フォントサイズ
- カメラ状態
- UI状態

これらはViewer、ViewModel、Drawing Model、Report Model、Export設定で扱う。

## 4. 共通型

```ts
export type AnalysisType =
  | "linearStatic"
  | "eigen"
  | "responseSpectrum"
  | "influenceLine"
  | "movingLoad";

export type AnalysisStatus = "success" | "warning" | "failed";

export type ResultSchema = {
  schemaVersion: string;
  resultId: string;
  projectId: string;
  analysisType: AnalysisType;
  status: AnalysisStatus;
  summary: ResultSummary;
  linearStaticResults?: LinearStaticResult[];
  eigenResult?: EigenResult;
  responseSpectrumResult?: ResponseSpectrumResult;
  influenceLineResult?: InfluenceLineResult;
  warnings: ResultMessage[];
  errors: ResultMessage[];
};

export type ResultSummary = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  solverName: string;
  nodeCount: number;
  memberCount: number;
  loadCaseCount?: number;
};

export type ResultMessage = {
  code: string;
  message: string;
  path?: string;
  entityType?: string;
  entityId?: string;
};
```

## 5. 線形静的解析結果

線形静的解析結果は、節点変位、反力、部材断面力を荷重ケースごとに保持する。

```ts
export type LinearStaticResult = {
  loadCaseId: string;
  displacements: NodeDisplacement[];
  reactions: NodeReaction[];
  memberSectionForces: MemberSectionForce[];
};

export type NodeDisplacement = {
  nodeId: string;
  ux: number;
  uy: number;
  uz: number;
  rx: number;
  ry: number;
  rz: number;
};

export type NodeReaction = {
  nodeId: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
};

export type MemberSectionForceComponent = "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";

export type MemberSectionForce = {
  memberId: string;
  station: number;
  component: MemberSectionForceComponent;
  value: number;
};
```

部材断面力成分は以下で統一する。

```text
N
Qy
Qz
Mx
My
Mz
```

## 6. 固有値解析結果

固有値解析結果は、固有値、固有周期、振動数、刺激係数、有効質量比を保持する。

```ts
export type EigenResult = {
  massCaseId: string;
  normalization: "mass" | "max";
  modes: EigenModeResult[];
};

export type EigenModeResult = {
  modeNo: number;
  eigenvalue: number;
  circularFrequency: number;
  frequency: number;
  period: number;
  modalMass: number;
  participationFactors: DirectionalValue[];
  effectiveMassRatios: DirectionalValue[];
  shape: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
    rx: number;
    ry: number;
    rz: number;
  }>;
};

export type DirectionalValue = {
  direction: "X" | "Y" | "Z" | string;
  value: number;
};
```

用語対応は以下とする。

| 日本語 | フィールド |
| --- | --- |
| 固有値 | `eigenvalue` |
| 固有周期 | `period` |
| 振動数 | `frequency` |
| 刺激係数 | `participationFactors` |
| 有効質量比 | `effectiveMassRatios` |

## 7. 応答スペクトル解析結果

応答スペクトル解析結果は、SRSSまたはCQCによるモード合成を扱い、モード別結果と合成結果を分けて保持する。

```ts
export type ResponseSpectrumCombinationMethod = "SRSS" | "CQC";

export type ResponseSpectrumResult = {
  spectrumCaseId: string;
  direction: "X" | "Y" | "Z" | string;
  dampingRatio: number;
  combinationMethod: ResponseSpectrumCombinationMethod;
  modalResults: ResponseSpectrumModalResult[];
  combinedResult: ResponseSpectrumCombinedResult;
};

export type ResponseSpectrumModalResult = {
  modeNo: number;
  spectralAcceleration: number;
  displacements: NodeDisplacement[];
  reactions?: NodeReaction[];
  memberSectionForces?: MemberSectionForce[];
};

export type ResponseSpectrumCombinedResult = {
  method: ResponseSpectrumCombinationMethod;
  displacements: NodeDisplacement[];
  reactions?: NodeReaction[];
  memberSectionForces?: MemberSectionForce[];
};
```

必須用語は以下である。

- SRSS
- CQC
- モード別結果
- 合成結果

## 8. 影響線解析結果

影響線解析結果は、単位荷重を載荷線上のstationへ置いたときの対象応答を保持する。影響線対象は節点変位、反力、断面力とする。

```ts
export type InfluenceLineResult = {
  caseId: string;
  lineId: string;
  unitLoad: {
    magnitude: number;
    direction: { x: number; y: number; z: number };
  };
  stations: InfluenceStation[];
  targets: InfluenceTarget[];
  targetResults: InfluenceTargetResult[];
};

export type InfluenceStation = {
  station: number;
  x: number;
  y: number;
  z: number;
};

export type InfluenceTarget =
  | {
      id: string;
      type: "nodeDisplacement";
      nodeId: string;
      component: "ux" | "uy" | "uz" | "rx" | "ry" | "rz";
    }
  | {
      id: string;
      type: "reaction";
      nodeId: string;
      component: "fx" | "fy" | "fz" | "mx" | "my" | "mz";
    }
  | {
      id: string;
      type: "memberSectionForce";
      memberId: string;
      component: MemberSectionForceComponent;
      station?: number;
    };

export type InfluenceTargetResult = {
  targetId: string;
  values: Array<{
    station: number;
    value: number;
  }>;
};
```

影響線対象の対応は以下とする。

| 対象 | `type` |
| --- | --- |
| 節点変位 | `nodeDisplacement` |
| 反力 | `reaction` |
| 断面力 | `memberSectionForce` |

## 9. ViewModel・帳票・図面への接続

Result Schemaは表示や帳票の最終形を直接持たない。各用途への変換は以下で行う。

- 表示: `Result Schema` から `ViewModel` を生成する。
- 図面: `Result Schema` から `Drawing Model` を生成する。
- 帳票: `Drawing Model` と `Result Schema` から `Report Model` を生成する。
- 出力: `Report Model` または `Drawing Model` から `Export` を実行する。

## 10. 関連文書

- [result-visualization.md](result-visualization.md)
- [report-drawing-output.md](report-drawing-output.md)
- [../investigation/visualization-study.md](../investigation/visualization-study.md)
- [eigen-analysis.md](eigen-analysis.md)
- [response-spectrum-analysis.md](response-spectrum-analysis.md)
- [influence-engine.md](influence-engine.md)

## Phase E-1b: eigenResult 拡張

後方互換性を維持するため、以下の新フィールドは optional として追加する。

- `eigenResult.totalMassByDirection`: 方向別総質量。`[{ direction: "X", value: ... }, ...]` 形式。
- `eigenResult.modes[].effectiveMasses`: 各モードの絶対有効質量。
- `eigenResult.modes[].cumulativeEffectiveMassRatios`: 各モードまでの累積有効質量比。

既存の `participationFactors`、`effectiveMassRatios`、`modalMass` は意味を変更しない。CSV 出力では `eigen_modes.csv` に固有値基本量、刺激係数、有効質量、有効質量比、累積有効質量比、方向別総質量を出力する。
